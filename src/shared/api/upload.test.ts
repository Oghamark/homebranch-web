import axios from "axios";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {uploadFilesInChunks, uploadWithProgress, type UploadRequestArgs} from "./upload";
import type {FetchBaseQueryError, FetchBaseQueryMeta, QueryReturnValue} from "@reduxjs/toolkit/query";

vi.mock("axios", () => ({default: {request: vi.fn()}}));
const axiosRequest = vi.mocked(axios.request);
const signal = new AbortController().signal;
const uploadId = "b839455b-1c8f-4f8a-9b83-82a413ac640d";
type Result = QueryReturnValue<unknown, FetchBaseQueryError, FetchBaseQueryMeta>;

beforeEach(() => vi.resetAllMocks());

describe("upload transport", () => {
    it("reports byte progress and sends multipart data with credentials, method and cancellation", async () => {
        const body = new FormData();
        body.append("chunk", new Blob(["content"]), "chunk");
        const progress = vi.fn();
        axiosRequest.mockImplementation(async options => {
            options.onUploadProgress?.({loaded: 375, total: 1000, bytes: 375, lengthComputable: true});
            options.onUploadProgress?.({loaded: 1100, total: 1000, bytes: 725, lengthComputable: true});
            return {status: 200, data: '{"received":true}'};
        });
        expect(await uploadWithProgress("/chunk", body, progress, signal, "PUT")).toEqual({data: {received: true}});
        expect(progress.mock.calls).toEqual([[0], [37], [100]]);
        expect(axiosRequest).toHaveBeenCalledWith(expect.objectContaining({
            url: "/chunk", method: "PUT", data: body, withCredentials: true, signal,
        }));
        expect(axiosRequest.mock.calls[0][0].headers).toBeUndefined();
    });

    it("does not invent progress when the total is unknown", async () => {
        const progress = vi.fn();
        axiosRequest.mockImplementation(async options => {
            options.onUploadProgress?.({loaded: 20, bytes: 20, lengthComputable: false});
            return {status: 200, data: ""};
        });
        expect(await uploadWithProgress("/chunk", new FormData(), progress, signal)).toEqual({data: null});
        expect(progress.mock.calls).toEqual([[0]]);
    });

    it("preserves HTTP errors for authentication refresh and metadata correction", async () => {
        axiosRequest.mockResolvedValueOnce({status: 401, data: '{"message":"Unauthorized"}'})
            .mockResolvedValueOnce({status: 400, data: '{"missingFields":["author"]}'});
        expect(await uploadWithProgress("/chunk", new FormData(), vi.fn(), signal))
            .toEqual({error: {status: 401, data: {message: "Unauthorized"}}});
        expect(await uploadWithProgress("/chunk", new FormData(), vi.fn(), signal))
            .toEqual({error: {status: 400, data: {missingFields: ["author"]}}});
    });

    it("surfaces connection failures and malformed server responses", async () => {
        axiosRequest.mockRejectedValueOnce(new Error("Network Error"))
            .mockResolvedValueOnce({status: 502, data: "Bad Gateway"});
        expect(await uploadWithProgress("/chunk", new FormData(), vi.fn(), signal))
            .toEqual({error: {status: "FETCH_ERROR", error: "Network Error"}});
        expect(await uploadWithProgress("/chunk", new FormData(), vi.fn(), signal))
            .toMatchObject({error: {status: "PARSING_ERROR", originalStatus: 502, data: "Bad Gateway"}});
    });
});

describe("chunked file uploads", () => {
    it("slices files, weights progress by bytes and finalizes metadata only after all chunks", async () => {
        const progress = vi.fn();
        const chunks: Array<{url: string; size: number}> = [];
        const request = vi.fn(async (args: UploadRequestArgs): Promise<Result> => {
            if (args.url === "/upload-sessions") return {data: {uploadId, chunkSize: 4}};
            if (args.method === "PUT") {
                const chunk = (args.body as FormData).get("chunk") as Blob;
                chunks.push({url: args.url, size: chunk.size});
                args.onUploadProgress?.(50);
                return {data: {received: true}};
            }
            return {data: {id: "book"}};
        });
        const result = await uploadFilesInChunks({
            url: "/books/audiobook/from-upload", method: "POST", body: {title: "Audio", author: "Author"},
            uploadFiles: [new File(["1234567890"], "one.mp3"), new File(["abcd"], "two.mp3")],
            onUploadProgress: progress,
        }, request);
        expect(result).toEqual({data: {id: "book"}});
        expect(chunks.map(chunk => chunk.size)).toEqual([4, 4, 2, 4]);
        expect(chunks.map(chunk => chunk.url)).toEqual([
            `/upload-sessions/${uploadId}/files/0/chunks/0`,
            `/upload-sessions/${uploadId}/files/0/chunks/1`,
            `/upload-sessions/${uploadId}/files/0/chunks/2`,
            `/upload-sessions/${uploadId}/files/1/chunks/0`,
        ]);
        expect(progress.mock.calls.map(([value]) => value)).toEqual([0, 14, 28, 42, 57, 64, 71, 85, 100, 100]);
        expect(request.mock.calls.at(-2)?.[0]).toEqual({
            url: "/books/audiobook/from-upload", method: "POST", body: {uploadId, title: "Audio", author: "Author"},
        });
        expect(request.mock.calls.at(-1)?.[0]).toEqual({url: `/upload-sessions/${uploadId}`, method: "DELETE"});
    });

    it("retries only transient chunk failures and never retries final book creation", async () => {
        const request = vi.fn(async (args: UploadRequestArgs): Promise<Result> => {
            if (args.url === "/upload-sessions") return {data: {uploadId, chunkSize: 8}};
            if (args.method === "PUT" && request.mock.calls.filter(([call]) => call.method === "PUT").length === 1) {
                return {error: {status: "FETCH_ERROR", error: "Connection lost"}};
            }
            if (args.method === "PUT" && request.mock.calls.filter(([call]) => call.method === "PUT").length === 2) {
                return {error: {status: "PARSING_ERROR", originalStatus: 502, data: "Bad Gateway", error: "Invalid JSON"}};
            }
            if (args.url === "/books/from-upload") return {error: {status: 400, data: {missingFields: ["author"]}}};
            return {data: {received: true}};
        });
        const result = await uploadFilesInChunks({
            url: "/books/from-upload", method: "POST", body: {},
            uploadFiles: [new File(["content"], "story.m4b")],
        }, request);
        expect(result).toEqual({error: {status: 400, data: {missingFields: ["author"]}}});
        const puts = request.mock.calls.filter(([args]) => args.method === "PUT");
        expect(puts).toHaveLength(3);
        expect(puts[1][0].body).toBe(puts[0][0].body);
        expect(request.mock.calls.filter(([args]) => args.url === "/books/from-upload")).toHaveLength(1);
    });

    it("stops on rejected chunks, cleans the session and preserves the upload error", async () => {
        const request = vi.fn(async (args: UploadRequestArgs): Promise<Result> => {
            if (args.url === "/upload-sessions") return {data: {uploadId, chunkSize: 4}};
            if (args.method === "PUT") return {error: {status: 413, data: {message: "Too large"}}};
            return {error: {status: 404, data: {message: "Already removed"}}};
        });
        expect(await uploadFilesInChunks({
            url: "/books/from-upload", method: "POST", uploadFiles: [new File(["content"], "story.m4b")],
        }, request)).toEqual({error: {status: 413, data: {message: "Too large"}}});
        expect(request).toHaveBeenCalledTimes(3);
        expect(request.mock.calls[2][0].method).toBe("DELETE");
    });

    it("does not start transfers if session creation fails or its response is invalid", async () => {
        for (const result of [{error: {status: 403, data: "Denied"}}, {data: {uploadId, chunkSize: 0}}] satisfies Result[]) {
            const request = vi.fn(async (): Promise<Result> => result);
            const response = await uploadFilesInChunks({
                url: "/books/from-upload", uploadFiles: [new File(["x"], "story.m4b")],
            }, request);
            expect(response.error).toBeDefined();
            expect(request).toHaveBeenCalledOnce();
        }
    });
});
