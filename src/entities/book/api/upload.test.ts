import {configureStore} from "@reduxjs/toolkit";
import {transferableAbortController} from "node:util";
import axios, {type AxiosRequestConfig} from "axios";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

vi.mock("@/shared", () => ({config: {
    apiUrl: "https://api.example.test/api/",
    authenticationUrl: "https://auth.example.test",
    cloudMode: false,
}}));
vi.mock("@/shared/lib/toast/toast", () => ({default: vi.fn()}));
vi.mock("@/features/authentication/api/cloudAccess", () => ({
    INACTIVE_MESSAGE: "Inactive",
    isInactiveAccountResponse: vi.fn().mockReturnValue(false),
    rejectInactiveAccount: vi.fn(),
}));
vi.mock("axios", () => ({default: {post: vi.fn()}}));

import {booksApi} from "./api";

const post = vi.mocked(axios.post);
function makeStore() {
    return configureStore({
        reducer: {[booksApi.reducerPath]: booksApi.reducer},
        middleware: getDefaultMiddleware => getDefaultMiddleware().concat(booksApi.middleware),
    });
}

beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("AbortController", class {
        constructor() {return transferableAbortController();}
    });
});
afterEach(() => vi.unstubAllGlobals());

describe("book upload requests", () => {
    it("connects file and audiobook progress without including the callback in multipart data", async () => {
        const progress = vi.fn();
        post.mockImplementation(async (_url, _body, options?: AxiosRequestConfig) => {
            options?.onUploadProgress?.({loaded: 50, total: 100, bytes: 50, lengthComputable: true});
            return {status: 201, data: '{"id":"book"}'};
        });
        const store = makeStore();
        const file = new File(["content"], "story.epub");
        await store.dispatch(booksApi.endpoints.createBook.initiate({
            file, title: "Story", author: "Author", isFavorite: false, onUploadProgress: progress,
        })).unwrap();
        expect(post.mock.calls[0][0]).toBe("https://api.example.test/api/books");
        const bookBody = post.mock.calls[0][1] as FormData;
        expect(bookBody.get("file")).toBe(file);
        expect(bookBody.get("title")).toBe("Story");
        expect(bookBody.get("isFavorite")).toBe("false");
        expect(bookBody.has("onUploadProgress")).toBe(false);
        expect(progress.mock.calls).toEqual([[0], [50]]);

        progress.mockClear();
        const tracks = [new File(["1"], "one.mp3"), new File(["2"], "two.mp3")];
        await store.dispatch(booksApi.endpoints.createAudiobook.initiate({
            files: tracks, title: "Audio", author: "Author", onUploadProgress: progress,
        })).unwrap();
        expect(post.mock.calls[1][0]).toBe("https://api.example.test/api/books/audiobook");
        const audioBody = post.mock.calls[1][1] as FormData;
        expect(audioBody.getAll("files")).toEqual(tracks);
        expect(audioBody.has("onUploadProgress")).toBe(false);
        expect(progress.mock.calls).toEqual([[0], [50]]);
        store.dispatch(booksApi.util.resetApiState());
    });

    it("refreshes authentication and retries the same multipart upload with progress reset", async () => {
        const fetch = vi.fn().mockResolvedValue(new Response('{"success":true}', {
            status: 200, headers: {"Content-Type": "application/json"},
        }));
        vi.stubGlobal("fetch", fetch);
        post.mockResolvedValueOnce({status: 401, data: '{"message":"Unauthorized"}'})
            .mockResolvedValueOnce({status: 201, data: '{"id":"book"}'});
        const store = makeStore();
        const progress = vi.fn();
        expect(await store.dispatch(booksApi.endpoints.createBook.initiate({
            file: new File(["content"], "story.epub"), isFavorite: false, onUploadProgress: progress,
        })).unwrap()).toEqual({id: "book"});
        expect(fetch).toHaveBeenCalledOnce();
        const refreshRequest = fetch.mock.calls[0][0] as Request;
        expect(refreshRequest.url).toBe("https://auth.example.test/refresh");
        expect(refreshRequest.method).toBe("POST");
        expect(refreshRequest.credentials).toBe("include");
        expect(post).toHaveBeenCalledTimes(2);
        expect(post.mock.calls[1][1]).toBe(post.mock.calls[0][1]);
        expect(progress.mock.calls).toEqual([[0], [0]]);
        store.dispatch(booksApi.util.resetApiState());
    });
});
