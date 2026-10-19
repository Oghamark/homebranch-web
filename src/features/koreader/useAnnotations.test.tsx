import {act, renderHook, waitFor} from "@testing-library/react";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {getAnnotations, putAnnotation, type Annotation} from "./api";
import {useAnnotations} from "./useAnnotations";
import {installMemoryStorage} from "@/test/memoryStorage";
vi.mock("./api", () => ({getAnnotations: vi.fn(), putAnnotation: vi.fn()}));
const list = vi.mocked(getAnnotations), put = vi.mocked(putAnnotation);
const item: Annotation = {id: "a", bookId: "book", quote: "A quote", note: "", color: "yellow", anchor: {version: 1, exact: "A quote", native: {pos0: "a", pos1: "b", domVersion: 1}}, deleted: false, revision: "1", updatedAt: "2026-10-01T00:00:00Z"};
beforeEach(() => {
    installMemoryStorage(); sessionStorage.setItem("user_id", "account");
    list.mockReset(); put.mockReset();
    list.mockResolvedValue({items: [item], cursor: "1", hasMore: false});
    put.mockImplementation(async (_book, id, body) => ({...item, ...body, id, deleted: body.deleted ?? false, revision: "2"}));
});
describe("private durable annotations", () => {
    it("retains a failed operation through remount and retries with the same mutation ID", async () => {
        put.mockRejectedValue(new Error("offline"));
        const first = renderHook(() => useAnnotations("book", true));
        await waitFor(() => expect(first.result.current.items).toHaveLength(1));
        act(() => { first.result.current.mutate("a", {...item, note: "Pending note"}); });
        await waitFor(() => expect(first.result.current.error).toContain("sync failed"));
        const mutationId = put.mock.calls[0][2].mutationId;
        expect(first.result.current.pending).toBe(1);
        expect(first.result.current.items[0].note).toBe("Pending note");
        first.unmount();
        put.mockImplementation(async (_book, id, body) => ({...item, ...body, id, deleted: body.deleted ?? false, revision: "2"}));
        list.mockResolvedValue({items: [], cursor: "2"});
        const second = renderHook(() => useAnnotations("book", true));
        await waitFor(() => expect(second.result.current.pending).toBe(0));
        expect(put.mock.calls[1][2].mutationId).toBe(mutationId);
        expect(second.result.current.items[0].note).toBe("Pending note");
        expect(second.result.current.error).toBe("");
    });
    it("preserves native selectors on note/style updates and propagates tombstones incrementally", async () => {
        const {result} = renderHook(() => useAnnotations("book", true));
        await waitFor(() => expect(result.current.items).toHaveLength(1));
        list.mockResolvedValue({items: [], cursor: "2"});
        act(() => { result.current.mutate("a", {...item, note: "Edited", color: "green"}); });
        await waitFor(() => expect(result.current.pending).toBe(0));
        expect(put.mock.calls[0][2].anchor.native).toEqual(item.anchor.native);
        expect(result.current.items[0].color).toBe("green");
        list.mockResolvedValue({items: [{...item, deleted: true, revision: "3"}], cursor: "3"});
        await act(async () => { await result.current.refresh(); });
        expect(result.current.items).toHaveLength(0);
        expect(list.mock.calls.at(-1)).toEqual(["book", "2"]);
    });
    it("paginates and refreshes on reconnect without losing queued deletes", async () => {
        list.mockResolvedValueOnce({items: [item], cursor: "1", hasMore: true})
            .mockResolvedValueOnce({items: [{...item, id: "b"}], cursor: "2", hasMore: false});
        const {result} = renderHook(() => useAnnotations("book", true));
        await waitFor(() => expect(result.current.items).toHaveLength(2));
        put.mockRejectedValueOnce(new Error("offline"));
        act(() => { result.current.mutate("a", {...item, deleted: true}); });
        await waitFor(() => expect(result.current.error).not.toBe(""));
        expect(result.current.items.map(value => value.id)).toEqual(["b"]);
        list.mockResolvedValue({items: [], cursor: "3"});
        act(() => { window.dispatchEvent(new Event("online")); });
        await waitFor(() => expect(result.current.pending).toBe(0));
        expect(put.mock.calls[0][2].mutationId).toBe(put.mock.calls[1][2].mutationId);
    });
    it("never uploads the previous account's pending work after account switching", async () => {
        put.mockRejectedValue(new Error("offline"));
        const {result, rerender} = renderHook(() => useAnnotations("book", true));
        await waitFor(() => expect(result.current.items).toHaveLength(1));
        act(() => { result.current.mutate("a", {...item, note: "Private to first account"}); });
        await waitFor(() => expect(result.current.error).not.toBe(""));
        const calls = put.mock.calls.length;
        sessionStorage.setItem("user_id", "other");
        await act(async () => { await result.current.refresh(); });
        expect(put).toHaveBeenCalledTimes(calls);
        list.mockResolvedValue({items: [], cursor: ""});
        rerender();
        await waitFor(() => expect(result.current.items).toHaveLength(0));
        expect(put).toHaveBeenCalledTimes(calls);
    });
    it("reports read errors instead of claiming a successful empty list", async () => {
        list.mockRejectedValueOnce(new Error("server failure"));
        const {result} = renderHook(() => useAnnotations("book", true));
        await waitFor(() => expect(result.current.error).toContain("sync failed"));
        await act(async () => { await result.current.refresh(); });
        expect(result.current.items).toHaveLength(1);
        expect(result.current.error).toBe("");
    });
});
