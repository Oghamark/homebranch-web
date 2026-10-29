import {configureStore} from "@reduxjs/toolkit";
import {act, cleanup, renderHook, waitFor} from "@testing-library/react";
import {Provider} from "react-redux";
import type {PropsWithChildren} from "react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {usersApi, useGetDisplayNamesQuery} from "@/entities/user/api/api";
import {authAxiosInstance} from "@/shared/api";

vi.mock("@/shared/api", () => ({authAxiosInstance: {post: vi.fn()}}));
vi.mock("@/shared/api/rtk-query", async () => {
    const {createApi} = await import("@reduxjs/toolkit/query/react");
    return {homebranchApi: createApi({
        baseQuery: async () => ({data: undefined}),
        tagTypes: ["User"],
        endpoints: () => ({})
    })};
});

const post = vi.mocked(authAxiosInstance.post);
const id = "123e4567-e89b-42d3-a456-426614174001";
const otherId = "123e4567-e89b-42d3-a456-426614174002";

function harness() {
    const store = configureStore({
        reducer: {[usersApi.reducerPath]: usersApi.reducer},
        middleware: getDefaultMiddleware => getDefaultMiddleware().concat(usersApi.middleware),
    });
    function wrapper({children}: PropsWithChildren) {
        return <Provider store={store}>{children}</Provider>;
    }
    return {store, wrapper};
}

describe("useGetDisplayNamesQuery", () => {
    beforeEach(() => {post.mockReset();});
    afterEach(cleanup);

    it("deduplicates and normalizes UUIDs, caching equivalent batches regardless of order", async () => {
        post.mockResolvedValue({data: {success: true, value: [{id, name: "Alice"}, {id: otherId, name: "Bob"}]}});
        const {wrapper, store} = harness();
        const {result, rerender} = renderHook(({ids}) => useGetDisplayNamesQuery(ids), {
            initialProps: {ids: [otherId, id.toUpperCase(), id]}, wrapper,
        });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(post).toHaveBeenCalledWith("/users/display-names", {userIds: [id, otherId]});
        rerender({ids: [id, otherId]});
        expect(result.current.data).toHaveLength(2);
        expect(post).toHaveBeenCalledOnce();
        cleanup();
        store.dispatch(usersApi.util.resetApiState());
    });

    it("chunks more than fifty unique UUIDs without exposing partial successful chunks", async () => {
        const ids = Array.from({length: 101}, (_, index) => `123e4567-e89b-42d3-a456-${String(index).padStart(12, "0")}`);
        post.mockImplementation(async (_url, body) => {
            const {userIds} = body as {userIds: string[]};
            return {data: {success: true, value: userIds.map(userId => ({id: userId, name: "Member"}))}};
        });
        const {wrapper, store} = harness();
        const {result} = renderHook(() => useGetDisplayNamesQuery([...ids, ids[0]]), {wrapper});
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(post.mock.calls.map(([, body]) => (body as {userIds: string[]}).userIds.length)).toEqual([50, 50, 1]);
        expect(result.current.data).toHaveLength(101);
        cleanup();
        store.dispatch(usersApi.util.resetApiState());
    });

    it("returns an error rather than confirmed absence when any chunk fails, and supports retry", async () => {
        const ids = Array.from({length: 51}, (_, index) => `123e4567-e89b-42d3-a456-${String(index).padStart(12, "0")}`);
        post.mockResolvedValueOnce({data: {success: true, value: [{id: ids[0], name: "Alice"}]}})
            .mockRejectedValueOnce({response: {status: 503, data: {message: "Unavailable"}}});
        const {wrapper, store} = harness();
        const {result} = renderHook(() => useGetDisplayNamesQuery(ids), {wrapper});
        await waitFor(() => expect(result.current.isError).toBe(true));
        expect(result.current.data).toBeUndefined();
        post.mockResolvedValue({data: {success: true, value: []}});
        await act(async () => {await result.current.refetch();});
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual([]);
        cleanup();
        store.dispatch(usersApi.util.resetApiState());
    });

    it("handles an empty batch without issuing a request", async () => {
        const {wrapper, store} = harness();
        const {result} = renderHook(() => useGetDisplayNamesQuery([]), {wrapper});
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual([]);
        expect(post).not.toHaveBeenCalled();
        cleanup();
        store.dispatch(usersApi.util.resetApiState());
    });
});
