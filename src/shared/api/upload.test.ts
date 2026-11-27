import axios, {type AxiosRequestConfig} from "axios";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {uploadWithProgress} from "./upload";

vi.mock("axios", () => ({default: {post: vi.fn()}}));
const post = vi.mocked(axios.post);
const signal = new AbortController().signal;

beforeEach(() => vi.resetAllMocks());

describe("upload transport", () => {
    it("reports byte progress and sends multipart data with credentials and cancellation", async () => {
        const body = new FormData();
        body.append("file", new File(["content"], "story.epub"));
        const progress = vi.fn();
        post.mockImplementation(async (_url, _body, options?: AxiosRequestConfig) => {
            options?.onUploadProgress?.({loaded: 375, total: 1000, bytes: 375, lengthComputable: true});
            options?.onUploadProgress?.({loaded: 1100, total: 1000, bytes: 725, lengthComputable: true});
            return {status: 201, data: '{"id":"book"}'};
        });
        expect(await uploadWithProgress("/books", body, progress, signal)).toEqual({data: {id: "book"}});
        expect(progress.mock.calls).toEqual([[0], [37], [100]]);
        expect(post).toHaveBeenCalledWith("/books", body, expect.objectContaining({withCredentials: true, signal}));
        expect(post.mock.calls[0][2]?.headers).toBeUndefined();
    });

    it("does not invent progress when the total is unknown", async () => {
        const progress = vi.fn();
        post.mockImplementation(async (_url, _body, options?: AxiosRequestConfig) => {
            options?.onUploadProgress?.({loaded: 20, bytes: 20, lengthComputable: false});
            return {status: 200, data: ""};
        });
        expect(await uploadWithProgress("/books", new FormData(), progress, signal)).toEqual({data: null});
        expect(progress.mock.calls).toEqual([[0]]);
    });

    it("preserves HTTP errors for authentication refresh and metadata correction", async () => {
        post.mockResolvedValueOnce({status: 401, data: '{"message":"Unauthorized"}'})
            .mockResolvedValueOnce({status: 400, data: '{"missingFields":["author"]}'});
        expect(await uploadWithProgress("/books", new FormData(), vi.fn(), signal))
            .toEqual({error: {status: 401, data: {message: "Unauthorized"}}});
        expect(await uploadWithProgress("/books", new FormData(), vi.fn(), signal))
            .toEqual({error: {status: 400, data: {missingFields: ["author"]}}});
    });

    it("surfaces connection failures and malformed server responses", async () => {
        post.mockRejectedValueOnce(new Error("Network Error"))
            .mockResolvedValueOnce({status: 502, data: "Bad Gateway"});
        expect(await uploadWithProgress("/books", new FormData(), vi.fn(), signal))
            .toEqual({error: {status: "FETCH_ERROR", error: "Network Error"}});
        expect(await uploadWithProgress("/books", new FormData(), vi.fn(), signal))
            .toMatchObject({error: {status: "PARSING_ERROR", originalStatus: 502, data: "Bad Gateway"}});
    });
});
