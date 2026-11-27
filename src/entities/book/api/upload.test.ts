import {configureStore} from "@reduxjs/toolkit";
import {transferableAbortController} from "node:util";
import axios from "axios";
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
vi.mock("axios", () => ({default: {request: vi.fn()}}));

import {booksApi} from "./api";

const axiosRequest = vi.mocked(axios.request);
const uploadId = "b839455b-1c8f-4f8a-9b83-82a413ac640d";
const fetch = vi.fn();
function makeStore() {
    return configureStore({
        reducer: {[booksApi.reducerPath]: booksApi.reducer},
        middleware: getDefaultMiddleware => getDefaultMiddleware().concat(booksApi.middleware),
    });
}

beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal("AbortController", class {
        constructor() {return transferableAbortController();}
    });
    vi.stubGlobal("fetch", fetch);
    fetch.mockImplementation(async (request: Request) => new Response(JSON.stringify(
        request.url.endsWith("/upload-sessions") ? {uploadId, chunkSize: 8} : {id: "book"},
    ), {status: 200, headers: {"Content-Type": "application/json"}}));
    axiosRequest.mockImplementation(async options => {
        options.onUploadProgress?.({loaded: 50, total: 100, bytes: 50, lengthComputable: true});
        return {status: 200, data: '{"received":true}'};
    });
});
afterEach(() => vi.unstubAllGlobals());

describe("book upload requests", () => {
    it("connects file progress to chunks and sends metadata separately", async () => {
        const progress = vi.fn();
        const store = makeStore();
        await store.dispatch(booksApi.endpoints.createBook.initiate({
            file: new File(["content"], "story.epub"), title: "Story", author: "Author",
            isFavorite: false, onUploadProgress: progress,
        })).unwrap();
        const chunkRequest = axiosRequest.mock.calls[0][0];
        expect(chunkRequest.url).toBe(`https://api.example.test/api/upload-sessions/${uploadId}/files/0/chunks/0`);
        expect(chunkRequest.method).toBe("PUT");
        expect((chunkRequest.data as FormData).has("onUploadProgress")).toBe(false);
        const finish = fetch.mock.calls.map(([request]) => request as Request)
            .find(request => request.url.endsWith("/books/from-upload"))!;
        expect(await finish.json()).toEqual({uploadId, title: "Story", author: "Author", isFavorite: false});
        expect(progress.mock.calls.map(([value]) => value)).toEqual([0, 0, 50, 100, 100]);
        store.dispatch(booksApi.util.resetApiState());
    });

    it("uses chunked requests for both audiobook creation and directory preview", async () => {
        const store = makeStore();
        const files = [new File(["one"], "one.mp3"), new File(["two"], "two.mp3")];
        await store.dispatch(booksApi.endpoints.createAudiobook.initiate({
            files, title: "Audio", author: "Author", onUploadProgress: vi.fn(),
        })).unwrap();
        await store.dispatch(booksApi.endpoints.previewAudiobook.initiate({
            files, relativePaths: ["Folder/one.mp3", "Folder/two.mp3"],
        })).unwrap();
        expect(axiosRequest).toHaveBeenCalledTimes(4);
        const requests = fetch.mock.calls.map(([request]) => request as Request);
        const audio = requests.find(request => request.url.endsWith("/books/audiobook/from-upload"))!;
        expect(await audio.json()).toEqual({uploadId, title: "Audio", author: "Author"});
        const preview = requests.find(request => request.url.endsWith("/books/audiobook/preview-from-upload"))!;
        expect(await preview.json()).toEqual({uploadId, relativePaths: ["Folder/one.mp3", "Folder/two.mp3"]});
        store.dispatch(booksApi.util.resetApiState());
    });

    it("refreshes authentication and retries the same chunk rather than restarting the file", async () => {
        axiosRequest.mockResolvedValueOnce({status: 401, data: '{"message":"Unauthorized"}'});
        const store = makeStore();
        const progress = vi.fn();
        expect(await store.dispatch(booksApi.endpoints.createBook.initiate({
            file: new File(["content"], "story.epub"), isFavorite: false, onUploadProgress: progress,
        })).unwrap()).toEqual({id: "book"});
        const refresh = fetch.mock.calls.map(([request]) => request as Request)
            .find(request => request.url === "https://auth.example.test/refresh")!;
        expect(refresh.method).toBe("POST");
        expect(refresh.credentials).toBe("include");
        expect(axiosRequest).toHaveBeenCalledTimes(2);
        expect(axiosRequest.mock.calls[1][0].data).toBe(axiosRequest.mock.calls[0][0].data);
        expect(fetch.mock.calls.filter(([request]) => (request as Request).url.endsWith("/upload-sessions")))
            .toHaveLength(1);
        store.dispatch(booksApi.util.resetApiState());
    });
});
