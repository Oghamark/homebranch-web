import {beforeEach, describe, expect, it, vi} from "vitest";
import {axiosInstance} from "@/shared/api/axios";
import {approvePairing, getAnnotations, getCrossReaderProgress, getDevices, putAnnotation, revokeDevice} from "./api";
vi.mock("@/shared/api/axios", () => ({axiosInstance: {get: vi.fn(), put: vi.fn(), post: vi.fn(), delete: vi.fn()}}));
beforeEach(() => vi.clearAllMocks());
describe("KOReader authenticated API contract", () => {
    it("uses the configured axios client and scopes every path and cursor", async () => {
        vi.mocked(axiosInstance.get).mockResolvedValue({data: []});
        vi.mocked(axiosInstance.put).mockResolvedValue({data: {id: "annotation"}});
        await approvePairing("CODE");
        await getDevices();
        await revokeDevice("reader/a");
        await getCrossReaderProgress("book/a");
        await getAnnotations("book/a", "123");
        const body = {mutationId: "stable-id", quote: "quote", note: "note", color: "yellow", anchor: {version: 1 as const, exact: "quote"}};
        expect(await putAnnotation("book/a", "annotation/a", body)).toEqual({id: "annotation"});
        expect(axiosInstance.post).toHaveBeenCalledWith("/koreader/pairings/approve", {userCode: "CODE"});
        expect(axiosInstance.delete).toHaveBeenCalledWith("/koreader/devices/reader%2Fa");
        expect(axiosInstance.get).toHaveBeenCalledWith("/koreader/books/book%2Fa/progress");
        expect(axiosInstance.get).toHaveBeenCalledWith("/koreader/books/book%2Fa/annotations", {params: {after: "123"}});
        expect(axiosInstance.put).toHaveBeenCalledWith("/koreader/books/book%2Fa/annotations/annotation%2Fa", body);
    });
    it("does not turn API errors into successful empty fallbacks", async () => {
        vi.mocked(axiosInstance.get).mockRejectedValueOnce(new Error("offline"));
        await expect(getDevices()).rejects.toThrow("offline");
    });
});
