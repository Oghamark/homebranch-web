import {configureStore} from "@reduxjs/toolkit";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import type {BulkBooksRequest} from "./api";

const requests = vi.hoisted(() => ({
    calls: [] as Array<{url: string; method?: string; body?: unknown}>,
    reject: false,
    toast: vi.fn(),
}));
vi.mock("@/shared/lib/toast/toast", () => ({default: requests.toast}));
vi.mock("@/shared/api/rtk-query", async () => {
    const {createApi} = await import("@reduxjs/toolkit/query/react");
    return {
        homebranchApi: createApi({
            reducerPath: "bulkTest",
            tagTypes: ["Book", "BookShelf", "BookDuplicate"],
            baseQuery: async (args: {url: string; method?: string; body?: unknown}) => {
                requests.calls.push(args);
                if (args.method === "POST" || args.method === "DELETE") {
                    if (requests.reject) return {error: {status: 403, data: {message: "Denied"}}};
                    return {data: args.method === "DELETE" ? {id: "first"} : {
                        success: false, succeeded: ["first"], failed: [{bookId: "second", message: "Denied"}],
                    }};
                }
                return {data: args.url.startsWith("/books?") ? {data: [{id: "second"}], total: 1} : {id: "first"}};
            },
            endpoints: () => ({}),
        }),
    };
});

import {booksApi} from "./api";

function makeStore() {
    return configureStore({
        reducer: {[booksApi.reducerPath]: booksApi.reducer},
        middleware: getDefaultMiddleware => getDefaultMiddleware().concat(booksApi.middleware),
    });
}

beforeEach(() => {
    const storage = new Map<string, string>();
    vi.stubGlobal("localStorage", {
        get length() {return storage.size;},
        key: (index: number) => [...storage.keys()][index] ?? null,
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => {storage.set(key, value);},
        removeItem: (key: string) => {storage.delete(key);},
        clear: () => storage.clear(),
    } satisfies Storage);
    requests.calls = [];
    requests.reject = false;
    requests.toast.mockClear();
    sessionStorage.setItem("user_id", "owner");
    localStorage.clear();
    localStorage.setItem("currentlyReading_owner", JSON.stringify({first: "position-1", second: "position-2"}));
    localStorage.setItem("readingProgress_owner", JSON.stringify({first: 0.5, second: 0.2}));
    for (const id of ["first", "second"]) {
        localStorage.setItem(`reader_position_time_owner_${id}`, "123");
        localStorage.setItem(`reader_position_sync_owner_${id}`, "456");
    }
});

afterEach(() => vi.unstubAllGlobals());

describe("bulk book requests", () => {
    it("refreshes active book and shelf queries and cleans only confirmed deletions from reading history", async () => {
        const api = booksApi.injectEndpoints({
            endpoints: build => ({
                getTestShelf: build.query<{id: string}, void>({
                    query: () => ({url: "/book-shelves/shelf"}),
                    providesTags: ["BookShelf"],
                }),
            }),
        });
        const store = makeStore();
        const detail = store.dispatch(booksApi.endpoints.getBookById.initiate("first"));
        const list = store.dispatch(booksApi.endpoints.searchBooks.initiate("Title"));
        const shelf = store.dispatch(api.endpoints.getTestShelf.initiate());
        await Promise.all([detail, list, shelf]);
        const response = await store.dispatch(booksApi.endpoints.bulkBooks.initiate({
            action: "delete", bookIds: ["first", "second"],
        })).unwrap();
        expect(response.success).toBe(false);
        await vi.waitFor(() => {
            expect(requests.calls.filter(call => call.url.startsWith("/books?"))).toHaveLength(2);
            expect(requests.calls.filter(call => call.url === "/books/first")).toHaveLength(2);
            expect(requests.calls.filter(call => call.url === "/book-shelves/shelf")).toHaveLength(2);
            expect(JSON.parse(localStorage.getItem("currentlyReading_owner")!)).toEqual({second: "position-2"});
            expect(JSON.parse(localStorage.getItem("readingProgress_owner")!)).toEqual({second: 0.2});
            expect(localStorage.getItem("reader_position_time_owner_first")).toBeNull();
            expect(localStorage.getItem("reader_position_sync_owner_first")).toBeNull();
            expect(localStorage.getItem("reader_position_time_owner_second")).toBe("123");
            expect(localStorage.getItem("reader_position_sync_owner_second")).toBe("456");
        });
        expect(requests.calls).toContainEqual({url: "/books/bulk/delete", method: "POST", body: {bookIds: ["first", "second"]}});
        detail.unsubscribe(); list.unsubscribe(); shelf.unsubscribe();
        store.dispatch(booksApi.util.resetApiState());
    });

    it("sends desired favorite state, shelf target and nullable owner without deleting reading history", async () => {
        const store = makeStore();
        const bodies: BulkBooksRequest[] = [
            {action: "favorite", bookIds: ["first"]},
            {action: "unfavorite", bookIds: ["second"]},
            {action: "add-to-shelf", bookIds: ["first"], shelfId: "shelf"},
            {action: "remove-from-shelf", bookIds: ["second"], shelfId: "shelf"},
            {action: "assign-owner", bookIds: ["first", "second"], ownerId: null},
        ];
        for (const request of bodies) {
            await store.dispatch(booksApi.endpoints.bulkBooks.initiate(request)).unwrap();
            const {action, ...body} = request;
            expect(requests.calls).toContainEqual({url: `/books/bulk/${action}`, method: "POST", body});
        }
        expect(JSON.parse(localStorage.getItem("currentlyReading_owner")!)).toEqual({first: "position-1", second: "position-2"});
        store.dispatch(booksApi.util.resetApiState());
    });

    it("does not clean local reading data when the deletion request fails", async () => {
        requests.reject = true;
        const store = makeStore();
        await expect(store.dispatch(booksApi.endpoints.bulkBooks.initiate({action: "delete", bookIds: ["first"]})).unwrap()).rejects.toEqual(
            {status: 403, data: {message: "Denied"}},
        );
        expect(JSON.parse(localStorage.getItem("currentlyReading_owner")!)).toEqual({first: "position-1", second: "position-2"});
        store.dispatch(booksApi.util.resetApiState());
    });

    it("shares correct local cleanup with individual book deletion and reports corrupt local history", async () => {
        const store = makeStore();
        await store.dispatch(booksApi.endpoints.deleteBook.initiate("first")).unwrap();
        await vi.waitFor(() => expect(JSON.parse(localStorage.getItem("currentlyReading_owner")!)).toEqual({second: "position-2"}));
        localStorage.setItem("currentlyReading_owner", "invalid");
        const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
        await store.dispatch(booksApi.endpoints.bulkBooks.initiate({action: "delete", bookIds: ["first", "second"]})).unwrap();
        await vi.waitFor(() => expect(requests.toast).toHaveBeenCalledWith({
            message: "Books were deleted, but local reading history could not be cleared.", type: "error",
        }));
        expect(warning).toHaveBeenCalledWith("Deleted books could not be removed from local reading history");
        warning.mockRestore();
        store.dispatch(booksApi.util.resetApiState());
    });
});
