import {fireEvent, render, waitFor} from "@testing-library/react";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {Provider} from "@/shared/ui/provider";
import {DragDropOverlay} from "./DragDropOverlay";

const upload = vi.hoisted(() => ({files: vi.fn(), uploading: false, toast: vi.fn()}));
vi.mock("./useBookUpload", () => ({
    useBookUpload: () => ({
        uploadStatuses: [], isDialogOpen: false, isUploading: upload.uploading,
        processFiles: upload.files, retryFailed: vi.fn(), closeDialog: vi.fn(),
    }),
}));
vi.mock("@/shared/ui/toaster", () => ({toaster: {create: upload.toast}}));
beforeEach(() => {vi.resetAllMocks(); upload.uploading = false;});

describe("drag and drop uploads", () => {
    it("reads every directory batch and preserves the EPUB/PDF drag-and-drop scope", async () => {
        const epub = new File(["epub"], "one.epub");
        const pdf = new File(["pdf"], "two.pdf");
        const mp3 = new File(["audio"], "audio.mp3");
        const entry = (file: File) => ({isFile: true, isDirectory: false, file: (done: (file: File) => void) => done(file)});
        const batches = [[entry(epub), entry(mp3)], [entry(pdf)], []];
        const reader = vi.fn((done: (entries: unknown[]) => void) => done(batches.shift()!));
        const directory = {isDirectory: true, createReader: () => ({readEntries: reader})};
        render(<Provider><DragDropOverlay/></Provider>);
        fireEvent.drop(document, {dataTransfer: {items: [{kind: "file", webkitGetAsEntry: () => directory}]}});
        await waitFor(() => expect(upload.files).toHaveBeenCalledWith([epub, pdf]));
        expect(reader).toHaveBeenCalledTimes(3);
    });

    it("does not replace an active upload with another drop", () => {
        upload.uploading = true;
        render(<Provider><DragDropOverlay/></Provider>);
        fireEvent.drop(document, {dataTransfer: {files: [new File(["book"], "new.epub")]}});
        expect(upload.files).not.toHaveBeenCalled();
        expect(upload.toast).toHaveBeenCalledWith(expect.objectContaining({title: expect.stringContaining("Wait for the current upload")}));
    });
});
