import {act, renderHook, waitFor} from "@testing-library/react";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {useBookUpload} from "./useBookUpload";

const api = vi.hoisted(() => ({create: vi.fn(), audio: vi.fn(), preview: vi.fn()}));
vi.mock("@/entities/book", () => ({
    useCreateBookMutation: () => [api.create],
    useCreateAudiobookMutation: () => [api.audio],
    usePreviewAudiobookMutation: () => [api.preview],
}));

beforeEach(() => vi.resetAllMocks());

describe("book upload batches", () => {
    it("keeps mixed directory outcomes and retries only failures with the original metadata", async () => {
        api.create.mockImplementation(({file}) => ({unwrap: () => file.name.endsWith(".pdf")
            ? Promise.resolve({skipped: true}) : Promise.resolve({id: "book"})}));
        api.audio.mockReturnValueOnce({unwrap: () => Promise.reject({message: "Audio upload interrupted"})})
            .mockReturnValueOnce({unwrap: () => Promise.resolve({id: "audio"})});
        const {result} = renderHook(useBookUpload);
        const files = [new File(["epub"], "story.epub"), new File(["pdf"], "existing.pdf")];
        const tracks = [new File(["1"], "one.mp3"), new File(["2"], "two.mp3")];
        await act(() => result.current.processBatch(files, [{title: "Edited title", author: "Edited author"}], [
            {title: "Reviewed audiobook", author: "Narrator", files: tracks},
        ]));
        expect(result.current.uploadStatuses).toEqual([
            {name: "story.epub", status: "success", error: undefined},
            {name: "existing.pdf", status: "skipped", error: undefined},
            {name: "Reviewed audiobook", status: "failed", error: "Audio upload interrupted"},
        ]);
        expect(api.create.mock.calls[0][0]).toMatchObject({title: "Edited title", author: "Edited author", file: files[0]});
        expect(result.current.isDialogOpen).toBe(true);
        expect(result.current.isUploading).toBe(false);
        await act(() => result.current.retryFailed());
        expect(api.create).toHaveBeenCalledTimes(2);
        expect(api.audio).toHaveBeenCalledTimes(2);
        expect(api.audio.mock.calls[1][0]).toEqual({title: "Reviewed audiobook", author: "Narrator", files: tracks});
        expect(result.current.uploadStatuses.map(status => status.status)).toEqual(["success", "skipped", "success"]);
    });

    it("protects an active batch from closing or being replaced", async () => {
        let resolve!: (value: unknown) => void;
        api.create.mockReturnValue({unwrap: () => new Promise(done => {resolve = done;})});
        const {result} = renderHook(useBookUpload);
        let upload!: Promise<void>;
        act(() => {upload = result.current.processFiles([new File(["x"], "original.epub")]);});
        await waitFor(() => expect(result.current.isUploading).toBe(true));
        act(() => result.current.closeDialog());
        await act(() => result.current.processFiles([new File(["x"], "replacement.pdf")]));
        expect(result.current.isDialogOpen).toBe(true);
        expect(api.create).toHaveBeenCalledTimes(1);
        expect(result.current.uploadStatuses[0].name).toBe("original.epub");
        await act(async () => {resolve({id: "done"}); await upload;});
        act(() => result.current.closeDialog());
        expect(result.current.isDialogOpen).toBe(false);
    });

    it("keeps EPUB, PDF, MP3 and M4B file uploads on the existing create contract", async () => {
        api.create.mockReturnValue({unwrap: () => Promise.resolve({id: "done"})});
        const {result} = renderHook(useBookUpload);
        const files = ["epub", "pdf", "mp3", "m4b"].map(extension => new File(["x"], `book.${extension}`));
        await act(() => result.current.processFiles(files));
        expect(api.create.mock.calls.map(([request]) => request.file)).toEqual(files);
        expect(api.create.mock.calls.every(([request]) => request.isFavorite === false)).toBe(true);
        expect(result.current.uploadStatuses.every(status => status.status === "success")).toBe(true);
    });
});
