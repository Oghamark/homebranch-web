import {configureStore} from "@reduxjs/toolkit";
import {act, renderHook, waitFor} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {socialApi, type SocialNotification} from "./api";
import {setupListeners} from "@reduxjs/toolkit/query";
import {createElement, type ReactNode} from "react";
import {Provider} from "react-redux";
import {useVisibleRefresh} from "@/shared/hooks/useVisibleRefresh";

const server = vi.hoisted(() => ({
    requests: [] as Array<{url: string; method?: string; body?: unknown; params?: unknown}>,
    incoming: [{id: "generation-1", userId: "reader", name: "Avery", createdAt: "2026-10-01T00:00:00Z"}],
    friends: [] as Array<{userId: string; name: string}>,
    notifications: [] as SocialNotification[],
    invitations: [{id: "invite-1", clubId: "club-1", clubName: "Sunday Readers", bookTitle: "A Good Book", bookAuthor: "An Author", inviterUserId: "owner", inviterName: "Rowan", expiresAt: "2099-01-01T00:00:00Z", status: "pending"}],
    fail: false,
}));
vi.mock("@/shared/api/rtk-query", async () => {
    const {createApi} = await import("@reduxjs/toolkit/query/react");
    return {homebranchApi: createApi({
        tagTypes: ["Social", "Notification", "BookClub"],
        endpoints: () => ({}),
        baseQuery: async (args: string | {url: string; method?: string; body?: unknown; params?: unknown}) => {
            const request = typeof args === "string" ? {url: args} : args;
            server.requests.push(request);
            if (server.fail) return {error: {status: 503, data: {message: "Unavailable"}}};
            if (request.url === "/social/friends") return {data: structuredClone(server.friends)};
            if (request.url === "/social/friend-requests") return {data: {incoming: structuredClone(server.incoming), outgoing: []}};
            if (request.url === "/social/friend-requests/generation-1/accept") {
                server.incoming = []; server.friends = [{userId: "reader", name: "Avery"}]; return {data: {}};
            }
            if (request.url === "/notifications/unread-count") return {data: {count: server.notifications.filter(item => !item.readAt).length}};
            if (request.url === "/notifications") return {data: {items: structuredClone(server.notifications), page: 1, limit: 20, total: server.notifications.length, unreadCount: server.notifications.filter(item => !item.readAt).length}};
            if (request.url === "/notifications/news-1/read") {server.notifications[0].readAt = "2026-10-02T00:00:00Z"; return {data: {}};}
            if (request.url === "/notifications/news-1" && request.method === "DELETE") {server.notifications = []; return {data: {}};}
            if (request.url === "/social/club-invitations") return {data: structuredClone(server.invitations)};
            return {data: {}};
        },
    })};
});

function harness() {
    return configureStore({
        reducer: {[socialApi.reducerPath]: socialApi.reducer},
        middleware: getDefault => getDefault().concat(socialApi.middleware),
    });
}
let store: ReturnType<typeof harness>;
beforeEach(() => {
    server.requests = []; server.fail = false;
    server.incoming = [{id: "generation-1", userId: "reader", name: "Avery", createdAt: "2026-10-01T00:00:00Z"}];
    server.friends = [];
    server.notifications = [{id: "news-1", kind: "club_invitation", actorName: "Rowan", createdAt: "2026-10-01T00:00:00Z", readAt: null, requestId: "invite-1", clubId: "club-1", clubName: "Sunday Readers"}];
    store = harness();
});
afterEach(() => store.dispatch(socialApi.util.resetApiState()));

describe("social wire contracts and caches", () => {
    it("sends an invitation with only recipient identity, not membership privileges", async () => {
        await store.dispatch(socialApi.endpoints.inviteToClub.initiate({clubId: "club-1", userId: "reader"})).unwrap();
        expect(server.requests).toEqual([{url: "/book-clubs/club-1/invitations", method: "POST", body: {userId: "reader"}}]);
    });
    it("accepts the exact request generation and refreshes pending requests and friendship lists", async () => {
        await Promise.all([
            store.dispatch(socialApi.endpoints.getFriends.initiate()).unwrap(),
            store.dispatch(socialApi.endpoints.getFriendRequests.initiate()).unwrap(),
        ]);
        await store.dispatch(socialApi.endpoints.respondToFriendRequest.initiate({requestId: "generation-1", action: "accept"})).unwrap();
        await waitFor(() => {
            expect(socialApi.endpoints.getFriends.select()(store.getState()).data).toEqual([{userId: "reader", name: "Avery"}]);
            expect(socialApi.endpoints.getFriendRequests.select()(store.getState()).data?.incoming).toEqual([]);
        });
    });
    it("reading and dismissing notifications never acts on their invitation", async () => {
        await Promise.all([
            store.dispatch(socialApi.endpoints.getNotifications.initiate(1)).unwrap(),
            store.dispatch(socialApi.endpoints.getUnreadNotificationCount.initiate()).unwrap(),
        ]);
        await store.dispatch(socialApi.endpoints.markNotificationRead.initiate("news-1")).unwrap();
        await waitFor(() => expect(socialApi.endpoints.getUnreadNotificationCount.select()(store.getState()).data?.count).toBe(0));
        await store.dispatch(socialApi.endpoints.dismissNotification.initiate("news-1")).unwrap();
        await waitFor(() => expect(socialApi.endpoints.getNotifications.select(1)(store.getState()).data?.items).toEqual([]));
        expect(server.requests.some(request => request.url.includes("invitations") && request.method === "POST")).toBe(false);
        const requests = await store.dispatch(socialApi.endpoints.getClubInvitations.initiate()).unwrap();
        expect(requests[0]).toMatchObject({id: "invite-1", status: "pending"});
    });
    it("does not optimistically invent friendship after a failed acceptance", async () => {
        await store.dispatch(socialApi.endpoints.getFriends.initiate()).unwrap();
        server.fail = true;
        await expect(store.dispatch(socialApi.endpoints.respondToFriendRequest.initiate({requestId: "generation-1", action: "accept"})).unwrap())
            .rejects.toMatchObject({status: 503});
        expect(socialApi.endpoints.getFriends.select()(store.getState()).data).toEqual([]);
    });
    it("uses explicit bounded inbox pagination", async () => {
        await store.dispatch(socialApi.endpoints.getNotifications.initiate(3)).unwrap();
        expect(server.requests[0]).toEqual({url: "/notifications", params: {page: 3, limit: 20}});
    });
    it("polls every 30 seconds, pauses when hidden, and refreshes on focus and reconnect", async () => {
        vi.useFakeTimers();
        const visibility = vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
        const stop = setupListeners(store.dispatch);
        const wrapper = ({children}: {children: ReactNode}) => createElement(Provider, {store, children});
        const query = renderHook(() => socialApi.useGetUnreadNotificationCountQuery(undefined, useVisibleRefresh()), {wrapper});
        try {
            await act(() => vi.advanceTimersByTimeAsync(1));
            const requests = () => server.requests.filter(request => request.url === "/notifications/unread-count").length;
            expect(requests()).toBe(1);
            await act(() => vi.advanceTimersByTimeAsync(30_001));
            expect(requests()).toBe(2);
            act(() => {visibility.mockReturnValue("hidden"); document.dispatchEvent(new Event("visibilitychange", {bubbles: true}));});
            await act(() => vi.advanceTimersByTimeAsync(60_001));
            expect(requests()).toBe(2);
            act(() => {visibility.mockReturnValue("visible"); document.dispatchEvent(new Event("visibilitychange", {bubbles: true}));});
            await act(() => vi.advanceTimersByTimeAsync(1));
            expect(requests()).toBe(3);
            act(() => {window.dispatchEvent(new Event("online"));});
            await act(() => vi.advanceTimersByTimeAsync(1));
            expect(requests()).toBe(4);
            query.unmount();
            store.dispatch(socialApi.util.resetApiState());
            await vi.advanceTimersByTimeAsync(60_001);
            expect(requests()).toBe(4);
        } finally {query.unmount(); stop(); visibility.mockRestore(); vi.useRealTimers();}
    });
});
