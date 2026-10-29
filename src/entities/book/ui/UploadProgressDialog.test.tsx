import {fireEvent, render, screen, within} from "@testing-library/react";
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
});
