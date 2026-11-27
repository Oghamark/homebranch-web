import {fireEvent, render, screen, waitFor, within} from "@testing-library/react";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {Provider} from "@/shared/ui/provider";
import {ManageBookFormatsButton} from "./ManageBookFormatsButton";
import type {BookModel} from "@/entities/book";

const api = vi.hoisted(() => ({link: vi.fn(), unlink: vi.fn(), deleteFormat: vi.fn(), refetch: vi.fn(), failed: false}));
vi.mock("@uidotdev/usehooks", () => ({useDebounce: (value: unknown) => value}));
vi.mock("@/entities/book", () => ({
    useLinkBooksMutation: () => [api.link, {}],
    useUnlinkBookFormatMutation: () => [api.unlink],
    useDeleteBookFormatMutation: () => [api.deleteFormat],
    useSearchBooksQuery: () => ({
        data: [{id: "source", title: "Other edition", author: "Writer", fileName: "source.pdf"}],
        isError: api.failed, isFetching: false, refetch: api.refetch,
    }),
}));
vi.mock("@/shared/lib/toast/toast", () => ({default: vi.fn()}));
vi.mock("@/shared/api/rtk-query", () => ({handleRtkError: vi.fn()}));

const book: BookModel = {
    id: "target", title: "The Orchard", author: "Writer", fileName: "book.epub", isFavorite: false, uploadedByUserId: "owner",
    formats: [{id: "epub", format: "EPUB", fileName: "book.epub"}, {id: "pdf", format: "PDF", fileName: "book.pdf"}],
};
beforeEach(() => {vi.resetAllMocks(); api.failed = false;});

async function open(canManage = true) {
    render(<Provider><ManageBookFormatsButton book={book} canManage={canManage}/></Provider>);
    fireEvent.click(screen.getByRole("button", {name: "Manage format links"}));
    return screen.findByRole("dialog", {name: "Formats for The Orchard"});
}

describe("format maintenance", () => {
    it("requires explicit merge confirmation and retains the selected draft after failure", async () => {
        api.link.mockReturnValue({unwrap: () => Promise.reject(new Error("conflict"))});
        const manager = await open();
        const field = within(manager).getByRole("textbox", {name: "Search library"});
        fireEvent.change(field, {target: {value: "Other edition"}});
        fireEvent.click(within(manager).getByRole("button", {name: /Other edition Writer/}));
        fireEvent.click(within(manager).getByRole("button", {name: "Link books"}));
        const confirm = await screen.findByRole("alertdialog", {name: "Link Other edition to The Orchard?"});
        expect(confirm).toHaveAccessibleDescription(/source entry is removed/);
        expect(api.link).not.toHaveBeenCalled();
        fireEvent.click(within(confirm).getByRole("button", {name: "Link books"}));
        expect(await within(confirm).findByRole("alert")).toBeVisible();
        expect(field).toHaveValue("Other edition");
        expect(api.link).toHaveBeenCalledWith({targetBookId: "target", sourceBookId: "source"});
    });

    it("confirms separating a format and surfaces failure", async () => {
        api.unlink.mockReturnValue({unwrap: () => Promise.reject(new Error("offline"))});
        const manager = await open();
        fireEvent.click(within(manager).getByRole("button", {name: "Unlink PDF"}));
        const confirm = await screen.findByRole("alertdialog", {name: "Unlink PDF from The Orchard?"});
        expect(confirm).toHaveAccessibleDescription(/own library entry/);
        fireEvent.click(within(confirm).getByRole("button", {name: "Unlink PDF"}));
        expect(await within(confirm).findByRole("alert")).toBeVisible();
        expect(api.unlink).toHaveBeenCalledWith({bookId: "target", formatId: "pdf"});
    });

    it("confirms deletion of a format without removing the book", async () => {
        api.deleteFormat.mockReturnValue({unwrap: () => Promise.resolve({...book, formats: [book.formats![0]]})});
        const manager = await open();
        fireEvent.click(within(manager).getByRole("button", {name: "Delete PDF"}));
        const confirm = await screen.findByRole("alertdialog", {name: "Delete PDF from The Orchard?"});
        expect(confirm).toHaveAccessibleDescription(/book and its other formats will remain/);
        expect(api.deleteFormat).not.toHaveBeenCalled();
        fireEvent.click(within(confirm).getByRole("button", {name: "Delete PDF"}));
        await waitFor(() => expect(api.deleteFormat).toHaveBeenCalledWith({bookId: "target", formatId: "pdf"}));
    });

    it("does not offer deletion for a single format", async () => {
        render(<Provider><ManageBookFormatsButton book={{...book, formats: [book.formats![0]]}} canManage/></Provider>);
        fireEvent.click(screen.getByRole("button", {name: "Manage format links"}));
        const manager = await screen.findByRole("dialog");
        expect(within(manager).queryByRole("button", {name: "Delete EPUB"})).not.toBeInTheDocument();
    });

    it("preserves read-only permissions and distinguishes failed search", async () => {
        const {unmount} = render(<Provider><ManageBookFormatsButton book={book} canManage={false}/></Provider>);
        fireEvent.click(screen.getByRole("button", {name: "Manage format links"}));
        const readOnly = await screen.findByRole("dialog");
        expect(within(readOnly).queryByRole("button", {name: "Unlink PDF"})).not.toBeInTheDocument();
        expect(within(readOnly).queryByRole("button", {name: "Delete PDF"})).not.toBeInTheDocument();
        expect(within(readOnly).queryByRole("textbox")).not.toBeInTheDocument();
        unmount();
        api.failed = true;
        const manager = await open();
        fireEvent.change(within(manager).getByRole("textbox"), {target: {value: "Orchard"}});
        expect(within(manager).getByRole("alert")).toHaveTextContent("Books could not be searched");
        expect(within(manager).queryByText("No matching books found.")).not.toBeInTheDocument();
    });
});
