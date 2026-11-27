import {fireEvent, render, screen, waitFor, within} from "@testing-library/react";
import {describe, expect, it, vi} from "vitest";
import {Provider} from "@/shared/ui/provider";
import {UploadProgressDialog} from "./UploadProgressDialog";

describe("upload feedback", () => {
    it("reports partial results honestly and offers retry without hiding successful books", async () => {
        const retry = vi.fn().mockResolvedValue(undefined);
        render(<Provider><UploadProgressDialog isOpen isUploading={false} onClose={vi.fn()} onRetryFailed={retry}
            statuses={[
                {name: "One.epub", status: "success"},
                {name: "Two.pdf", status: "skipped"},
                {name: "Three.m4b", status: "failed", error: "Connection lost"},
            ]}/></Provider>);
        const dialog = await screen.findByRole("dialog", {name: "Upload needs attention"});
        expect(within(dialog).getByRole("status")).toHaveTextContent("3 of 3 processed.");
        expect(within(dialog).getByText(/Successfully added books are kept/)).toBeVisible();
        expect(within(dialog).getByText("Connection lost")).toBeVisible();
        expect(within(dialog).getByRole("progressbar")).toHaveAttribute("aria-valuenow", "3");
        fireEvent.click(within(dialog).getByRole("button", {name: "Retry failed uploads"}));
        expect(retry).toHaveBeenCalledOnce();
    });

    it("keeps an active upload open and removes dismissal controls", async () => {
        const close = vi.fn();
        render(<Provider><UploadProgressDialog isOpen isUploading onClose={close}
            statuses={[{name: "Long story.epub", status: "uploading"}]}/></Provider>);
        const dialog = await screen.findByRole("dialog");
        expect(within(dialog).queryByRole("button", {name: /Close/})).not.toBeInTheDocument();
        fireEvent.keyDown(dialog, {key: "Escape"});
        expect(close).not.toHaveBeenCalled();
        expect(within(dialog).getByRole("status")).toHaveTextContent("Keep this window open");
    });

    it("opens a failed row's metadata editor, requires missing fields and retries only that row", async () => {
        const retry = vi.fn().mockResolvedValue(undefined);
        render(<Provider><UploadProgressDialog isOpen isUploading={false} onClose={vi.fn()} onRetryWithMetadata={retry}
            statuses={[
                {name: "Added.epub", status: "success"},
                {name: "Missing.pdf", status: "failed", error: "Author is missing", metadata: {title: "Known title"}, missingFields: ["author"]},
            ]}/></Provider>);
        fireEvent.click(await screen.findByRole("button", {name: "Edit metadata for Missing.pdf"}));
        const editor = await screen.findByRole("dialog", {name: "Complete book metadata"});
        expect(within(editor).getByRole("textbox", {name: "Title"})).toHaveValue("Known title");
        expect(within(editor).getByRole("button", {name: "Save and retry"})).toBeDisabled();
        fireEvent.change(within(editor).getByRole("textbox", {name: /Author/}), {target: {value: "Author"}});
        fireEvent.click(within(editor).getByRole("button", {name: "Save and retry"}));
        expect(retry).toHaveBeenCalledWith(1, {title: "Known title", author: "Author"});
    });

    it("allows cancelling metadata correction without retrying the upload", async () => {
        const retry = vi.fn();
        render(<Provider><UploadProgressDialog isOpen isUploading={false} onClose={vi.fn()} onRetryWithMetadata={retry}
            statuses={[{name: "Missing.epub", status: "failed", missingFields: ["title", "author"]}]}/></Provider>);
        fireEvent.click(await screen.findByRole("button", {name: "Edit metadata for Missing.epub"}));
        const editor = await screen.findByRole("dialog", {name: "Complete book metadata"});
        fireEvent.click(within(editor).getByRole("button", {name: "Cancel"}));
        expect(retry).not.toHaveBeenCalled();
        await waitFor(() => expect(screen.getByRole("dialog", {name: "Upload needs attention"})).toBeVisible());
    });
});
