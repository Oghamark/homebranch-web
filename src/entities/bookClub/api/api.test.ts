import {configureStore} from "@reduxjs/toolkit";
import {waitFor} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {bookClubsApi, type BookClubScheduleResponse, type ProgressStatus} from "./api";

const server = vi.hoisted(() => ({
    schedule: undefined as BookClubScheduleResponse | undefined,
    failProgress: false,
    requests: [] as Array<{url: string; method?: string; body?: unknown}>,
}));

vi.mock("@/shared/api/rtk-query", async () => {
    const {createApi} = await import("@reduxjs/toolkit/query/react");
    return {homebranchApi: createApi({
        tagTypes: ["BookClub", "Book", "User"],
        baseQuery: async (request: {url: string; method?: string; body?: unknown}) => {
            server.requests.push(request);
            if (request.url.endsWith("/progress")) {
                if (server.failProgress) return {error: {status: 503, data: "Unavailable"}};
                const milestoneId = request.url.split("/").at(-2)!;
                const {status} = request.body as {status: ProgressStatus};
                server.schedule!.myProgress = [{milestoneId, status, percentage: null}];
                const member = server.schedule!.sharedProgress?.find(group => group.userId === "current-reader");
                if (member) member.milestones = [{milestoneId, status, percentage: null}];
                return {data: {milestoneId, status, percentage: null}};
            }
            return {data: structuredClone(server.schedule)};
        },
        endpoints: () => ({}),
    })};
});

const clubId = "club-1";
function harness() {
    return configureStore({
        reducer: {[bookClubsApi.reducerPath]: bookClubsApi.reducer},
        middleware: getDefaultMiddleware => getDefaultMiddleware().concat(bookClubsApi.middleware),
    });
}
let store: ReturnType<typeof harness>;

beforeEach(() => {
    server.requests = [];
    server.failProgress = false;
    server.schedule = {
        clubId, startDate: null, completionDate: null, progressSharingEnabled: false,
        milestones: [
            {id: "step-1", name: "Opening", kind: "chapter", position: 1},
            {id: "step-2", name: "Finale", kind: "part", position: 2},
        ],
        myProgress: [],
        myMappings: [],
        sharedProgress: [],
    };
    store = harness();
});
afterEach(() => store.dispatch(bookClubsApi.util.resetApiState()));

describe("book club schedule API response", () => {
    it("attaches the caller's separate progress and private mappings by milestone ID", async () => {
        server.schedule!.myProgress = [{milestoneId: "step-2", status: "completed", percentage: 100}];
        server.schedule!.myMappings = [{milestoneId: "step-1", memberLabel: "My introduction", memberPosition: 3}];
        const response = await store.dispatch(bookClubsApi.endpoints.getBookClubSchedule.initiate(clubId)).unwrap();
        expect(response.milestones[0]).toMatchObject({
            memberProgress: null, memberMapping: {memberLabel: "My introduction", memberPosition: 3},
        });
        expect(response.milestones[1]).toMatchObject({
            memberProgress: {status: "completed", percentage: 100}, memberMapping: null,
        });
        expect(response).not.toHaveProperty("myProgress");
        expect(server.schedule!.milestones[0]).not.toHaveProperty("memberMapping");
    });

    it("preserves every member group without applying another reader's status to the caller", async () => {
        server.schedule!.sharedProgress = [{
            userId: "another-reader", milestones: [
                {milestoneId: "step-1", status: "completed", percentage: null},
                {milestoneId: "step-2", status: "in_progress", percentage: 50},
            ],
        }];
        const response = await store.dispatch(bookClubsApi.endpoints.getBookClubSchedule.initiate(clubId)).unwrap();
        expect(response.sharedProgress).toEqual([
            {userId: "another-reader", milestones: [
                {milestoneId: "step-1", status: "completed", percentage: null},
                {milestoneId: "step-2", status: "in_progress", percentage: 50},
            ]},
        ]);
        expect(response.milestones.every(step => step.memberProgress === null)).toBe(true);
    });
    it("retains members with no reading steps in the view model", async () => {
        server.schedule!.milestones = [];
        server.schedule!.sharedProgress = [{userId: "new-member", milestones: []}];
        const response = await store.dispatch(bookClubsApi.endpoints.getBookClubSchedule.initiate(clubId)).unwrap();
        expect(response.sharedProgress).toEqual([{userId: "new-member", milestones: []}]);
    });

    it("refetches and exposes persisted completion, undo, and in-progress changes in the shared schedule cache", async () => {
        const otherReader = {userId: "another-reader", milestones: [{milestoneId: "step-1", status: "completed" as const, percentage: null}]};
        server.schedule!.sharedProgress = [
            {userId: "current-reader", milestones: [{milestoneId: "step-1", status: "not_started", percentage: null}]},
            otherReader,
        ];
        const query = store.dispatch(bookClubsApi.endpoints.getBookClubSchedule.initiate(clubId));
        await query.unwrap();
        for (const status of ["completed", "not_started", "in_progress"] as const) {
            await store.dispatch(bookClubsApi.endpoints.setMilestoneProgress.initiate({
                clubId, milestoneId: "step-1", status,
            })).unwrap();
            await waitFor(() => expect(bookClubsApi.endpoints.getBookClubSchedule.select(clubId)(store.getState())
                .data?.milestones[0].memberProgress?.status).toBe(status));
            expect(bookClubsApi.endpoints.getBookClubSchedule.select(clubId)(store.getState()).data?.sharedProgress).toEqual([
                {userId: "current-reader", milestones: [{milestoneId: "step-1", status, percentage: null}]},
                otherReader,
            ]);
        }
        expect(server.requests.filter(request => request.method === "PUT")).toEqual(
            ["completed", "not_started", "in_progress"].map(status => ({
                url: "/book-clubs/club-1/milestones/step-1/progress", method: "PUT", body: {status},
            })),
        );
        expect(server.requests.filter(request => request.url.endsWith("/schedule"))).toHaveLength(4);
        query.unsubscribe();
        store.dispatch(bookClubsApi.util.resetApiState());
        const reloaded = await store.dispatch(bookClubsApi.endpoints.getBookClubSchedule.initiate(clubId)).unwrap();
        expect(reloaded.milestones[0].memberProgress?.status).toBe("in_progress");
    });

    it("does not display completion after a failed write or retain suppressed personal progress", async () => {
        const query = store.dispatch(bookClubsApi.endpoints.getBookClubSchedule.initiate(clubId));
        await query.unwrap();
        server.failProgress = true;
        await expect(store.dispatch(bookClubsApi.endpoints.setMilestoneProgress.initiate({
            clubId, milestoneId: "step-1", status: "completed",
        })).unwrap()).rejects.toMatchObject({status: 503});
        expect(bookClubsApi.endpoints.getBookClubSchedule.select(clubId)(store.getState())
            .data?.milestones[0].memberProgress).toBeNull();
        server.schedule!.myProgress = [{milestoneId: "step-1", status: "completed", percentage: null}];
        await query.refetch();
        server.schedule!.myProgress = [];
        await query.refetch();
        expect(bookClubsApi.endpoints.getBookClubSchedule.select(clubId)(store.getState())
            .data?.milestones[0].memberProgress).toBeNull();
    });
});
