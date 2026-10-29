import {fireEvent, render, screen, waitFor, within} from "@testing-library/react";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {Provider} from "@/shared/ui/provider";
import {AddBookButton} from "./AddBookButton";

const upload = vi.hoisted(() => ({preview: vi.fn(), files: vi.fn(), batch: vi.fn(), retry: vi.fn()}));
vi.mock("./useBookUpload", () => ({
    useBookUpload: () => ({
        uploadStatuses: [], isDialogOpen: false, isUploading: false,
        processFiles: upload.files, processBatch: upload.batch, previewAudiobook: upload.preview,
        retryFailed: upload.retry, closeDialog: vi.fn(),
    }),
}));
vi.mock("@/shared/ui/toaster", () => ({toaster: {create: vi.fn()}}));
beforeEach(() => vi.resetAllMocks());

const files = [
    new File(["first"], "one.mp3"),
    new File(["second"], "two.mp3"),
    new File(["book"], "story.epub"),
    new File(["book"], "appendix.pdf"),
    new File(["audio"], "recording.m4b"),
];
const preview = [{
    title: "Tagged album", author: "Tagged artist", source: "tags",
    tracks: [{index: 0, path: "album/one.mp3", title: "Chapter one"}, {index: 1, path: "album/two.mp3", title: "Chapter two"}],
}];

describe("audiobook directory review", () => {
    it("keeps grouping edits when closed and submits all formats as one reviewed batch", async () => {
        upload.preview.mockResolvedValue(preview);
        upload.batch.mockResolvedValue(undefined);
        const {container} = render(<Provider><AddBookButton/></Provider>);
        const directory = container.querySelector("input[webkitdirectory]")!;
        fireEvent.change(directory, {target: {files}});
        const dialog = await screen.findByRole("dialog", {name: "Review audiobook groups"});
        const title = within(dialog).getByRole("textbox", {name: "Audiobook title for group 1"});
        fireEvent.change(title, {target: {value: "Reviewed title"}});
        fireEvent.click(within(dialog).getByRole("button", {name: "Cancel"}));
        fireEvent.click(await screen.findByRole("button", {name: "Add books"}));
        fireEvent.click(await screen.findByRole("menuitem", {name: "Resume audiobook review"}));
        const reopened = await screen.findByRole("dialog", {name: "Review audiobook groups"});
        expect(within(reopened).getByRole("textbox", {name: "Audiobook title for group 1"})).toHaveValue("Reviewed title");
        fireEvent.click(within(reopened).getByRole("button", {name: "Upload books"}));
        await waitFor(() => expect(upload.batch).toHaveBeenCalledOnce());
        expect(upload.batch).toHaveBeenCalledWith(
            files.slice(2), [undefined, undefined, undefined],
            [{title: "Reviewed title", author: "Tagged artist", files: files.slice(0, 2)}],
        );
    });

    it("retains directory files for retry after an audiobook preview fails", async () => {
        upload.preview.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(preview);
        const {container} = render(<Provider><AddBookButton/></Provider>);
        fireEvent.change(container.querySelector("input[webkitdirectory]")!, {target: {files}});
        expect(await screen.findByRole("alert")).toHaveTextContent("Your selected files are kept");
        fireEvent.click(screen.getByRole("button", {name: "Try again"}));
        await screen.findByRole("dialog", {name: "Review audiobook groups"});
        expect(upload.preview).toHaveBeenCalledTimes(2);
        expect(upload.preview.mock.calls[1][0]).toEqual(files.slice(0, 2));
    });
});
