import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {MemberName, MemberNamesProvider} from "./MemberName";
import {useGetDisplayNamesQuery} from "@/entities/user/api/api";

vi.mock("@/entities/user/api/api", () => ({useGetDisplayNamesQuery: vi.fn()}));

const query = vi.mocked(useGetDisplayNamesQuery);
const userId = "123e4567-e89b-42d3-a456-426614174001";
const otherId = "123e4567-e89b-42d3-a456-426614174002";

function result(overrides: Record<string, unknown> = {}) {
    return {currentData: undefined, isError: false, isFetching: false, isSuccess: false, refetch: vi.fn(), ...overrides} as unknown as ReturnType<typeof useGetDisplayNamesQuery>;
}

describe("MemberName", () => {
    beforeEach(() => {query.mockReset();});
    afterEach(cleanup);

    it("uses the display-name hook without exposing UUIDs while loading", () => {
        query.mockReturnValue(result({isFetching: true}));
        const {container} = render(<MemberName userId={userId}/>);
        expect(screen.getByText("Loading member…")).toBeTruthy();
        expect(container.textContent).not.toContain(userId);
        expect(query.mock.calls[0][0]).toEqual([userId]);
    });

    it("renders a resolved name and treats UUID case equivalently", () => {
        query.mockReturnValue(result({currentData: [{id: userId.toUpperCase(), name: "Alice"}], isSuccess: true}));
        render(<MemberName userId={userId}/>);
        expect(screen.getByText("Alice")).toBeTruthy();
    });

    it("shows Former member only after a successful confirmed absence", () => {
        query.mockReturnValue(result({currentData: [], isSuccess: true}));
        render(<MemberName userId={userId}/>);
        expect(screen.getByText("Former member")).toBeTruthy();
    });

    it("does not show Former member during a pending lookup or refetch", () => {
        query.mockReturnValue(result({currentData: [], isSuccess: true, isFetching: true}));
        render(<MemberName userId={userId}/>);
        expect(screen.queryByText("Former member")).toBeNull();
        expect(screen.getByText("Loading member…")).toBeTruthy();
    });

    it("offers visible retry for errors instead of assuming a former member", () => {
        const refetch = vi.fn();
        query.mockReturnValue(result({currentData: [], isError: true, isSuccess: true, refetch}));
        const {container} = render(<MemberName userId={userId}/>);
        expect(screen.queryByText("Former member")).toBeNull();
        expect(container.textContent).not.toContain(userId);
        fireEvent.click(screen.getByRole("button", {name: "Retry loading member name"}));
        expect(refetch).toHaveBeenCalledOnce();
    });

    it("shares the same batch across provider children for RTK deduplication", () => {
        query.mockReturnValue(result({currentData: [{id: userId, name: "Alice"}, {id: otherId, name: "Bob"}], isSuccess: true}));
        render(<MemberNamesProvider userIds={[userId, otherId]}><span><MemberName userId={userId}/></span><span><MemberName userId={otherId}/></span></MemberNamesProvider>);
        expect(screen.getByText("Alice")).toBeTruthy();
        expect(screen.getByText("Bob")).toBeTruthy();
        expect(query.mock.calls.map(([ids]) => ids)).toEqual([[userId, otherId], [userId, otherId]]);
    });

    it("falls back to an individual lookup for a user not in the provider batch", () => {
        query.mockReturnValue(result({isFetching: true}));
        render(<MemberNamesProvider userIds={[otherId]}><MemberName userId={userId}/></MemberNamesProvider>);
        expect(query.mock.calls[0][0]).toEqual([userId]);
    });
});
