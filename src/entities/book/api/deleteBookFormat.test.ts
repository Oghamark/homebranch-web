import {configureStore} from "@reduxjs/toolkit";
import {beforeEach, describe, expect, it, vi} from "vitest";

const requests = vi.hoisted(() => ({calls: [] as Array<{url: string; method?: string}>, deleted: false}));
vi.mock("@/shared/api/rtk-query", async () => {
    const {createApi} = await import("@reduxjs/toolkit/query/react");
    return {
        homebranchApi: createApi({
            reducerPath: "testApi",
            tagTypes: ["Book", "BookDuplicate"],
            baseQuery: async (args: {url: string; method?: string}) => {
                requests.calls.push(args);
                if (args.method === "DELETE") requests.deleted = true;
                const book = {id: "book", title: "Title", formats: requests.deleted ? [{id: "epub"}] : [{id: "epub"}, {id: "pdf"}]};
                return {data: args.url.startsWith("/books?") ? {data: [book], total: 1} : book};
            },
            endpoints: () => ({}),
        }),
    };
});

import {booksApi} from "./api";

describe("delete format mutation", () => {
    beforeEach(() => { requests.calls = []; requests.deleted = false; });

    it("deletes the selected format and refreshes detail and library queries", async () => {
        const store = configureStore({
            reducer: {[booksApi.reducerPath]: booksApi.reducer},
            middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(booksApi.middleware),
        });
        const detail = store.dispatch(booksApi.endpoints.getBookById.initiate("book"));
        const list = store.dispatch(booksApi.endpoints.searchBooks.initiate("Title"));
        await Promise.all([detail, list]);
        await store.dispatch(booksApi.endpoints.deleteBookFormat.initiate({bookId: "book", formatId: "pdf"})).unwrap();
        await vi.waitFor(() => {
            const data = booksApi.endpoints.getBookById.select("book")(store.getState()).data;
            expect(data?.formats).toEqual([{id: "epub"}]);
            expect(requests.calls.filter((call) => call.url.startsWith("/books?"))).toHaveLength(2);
        });
        expect(requests.calls).toContainEqual({url: "/books/book/formats/pdf/file", method: "DELETE"});
        detail.unsubscribe();
        list.unsubscribe();
    });
});
