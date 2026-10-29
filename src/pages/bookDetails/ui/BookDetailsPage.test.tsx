import {fireEvent, render, screen, waitFor, within} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {MemoryRouter, useLocation} from "react-router";
import {Provider} from "@/shared/ui/provider";
import type {BookModel} from "@/entities/book";
import BookDetailsPage from "./BookDetailsPage";

const api = vi.hoisted(() => ({
    deleteBook: vi.fn(), favorite: vi.fn(), summary: vi.fn(), metadata: vi.fn(),
    covers: vi.fn(), selectCover: vi.fn(), deletePosition: vi.fn(), savedPosition: vi.fn(),
    send: vi.fn(), mail: {configured: true}, kindle: {kindleEmail: ""},
}));
vi.mock("@/entities/book", () => ({
    useDeleteBookMutation: () => [api.deleteBook, {}],
    useToggleFavoriteMutation: () => [api.favorite, {}],
    useGenerateBookSummaryMutation: () => [api.summary, {}],
    useFetchBookMetadataMutation: () => [api.metadata, {}],
    useSearchBookCoversMutation: () => [api.covers, {}],
    useSelectBookCoverMutation: () => [api.selectCover, {}],
}));
vi.mock("@/entities/bookShelf", () => ({ManageBookShelvesButton: () => <button>Manage shelves</button>}));
vi.mock("./ManageBookFormatsButton", () => ({ManageBookFormatsButton: ({canManage}: {canManage: boolean}) => <span>Format maintenance {canManage ? "allowed" : "read only"}</span>}));
vi.mock("@/features/reader/api/savedPositionApi", () => ({
    deleteSavedPosition: (...args: unknown[]) => api.deletePosition(...args),
    getSavedPosition: (...args: unknown[]) => api.savedPosition(...args),
}));
vi.mock("@/features/reader", () => ({getStoredProgress: () => 0.3, removeStoredProgress: vi.fn()}));
vi.mock("@/entities/kindle", () => ({
    useGetMailSenderQuery: () => ({data: api.mail}),
    useGetKindleEmailQuery: () => ({data: api.kindle}),
    useSendToKindleMutation: () => [api.send, {}],
    getApiErrorMessage: () => "Delivery failed",
}));
vi.mock("@/shared/lib/toast/toast", () => ({default: vi.fn()}));
vi.mock("@/shared/api/rtk-query", () => ({handleRtkError: vi.fn()}));

const book: BookModel = {
    id: "orchard", title: "The Orchard", author: "A. Writer", fileName: "orchard.epub",
    isFavorite: false, uploadedByUserId: "owner",
    formats: [
        {id: "epub", format: "EPUB", fileName: "orchard.epub"},
        {id: "audio", format: "MP3", fileName: "orchard.mp3", title: "The Orchard, narrated", author: "A. Narrator"},
    ],
};
function CurrentLocation() {
    const {pathname, search} = useLocation();
    return <output aria-label="Current location">{pathname}{search}</output>;
}
const renderBook = () => render(<Provider><MemoryRouter><BookDetailsPage book={book}/><CurrentLocation/></MemoryRouter></Provider>);

beforeEach(() => {
    vi.resetAllMocks();
    const storage = new Map<string, string>();
    vi.stubGlobal("localStorage", {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
        removeItem: (key: string) => storage.delete(key),
        clear: () => storage.clear(),
    });
    localStorage.clear();
    sessionStorage.clear();
    sessionStorage.setItem("user_id", "owner");
    sessionStorage.setItem("user_role", "USER");
    api.savedPosition.mockResolvedValue(null);
    api.kindle.kindleEmail = "";
});
afterEach(() => vi.unstubAllGlobals());

describe("book detail actions", () => {
    it("preserves format-specific reading, listening, metadata and download links", () => {
        renderBook();
        expect(screen.getByRole("heading", {level: 1, name: "The Orchard"})).toBeVisible();
        expect(screen.getByRole("link", {name: "Read"})).toHaveAttribute("href", "/books/orchard/read?format=EPUB");
        fireEvent.click(screen.getByRole("button", {name: "MP3 audiobook"}));
        expect(screen.getByRole("link", {name: "Listen"})).toHaveAttribute("href", "/books/orchard/read?format=MP3");
        expect(screen.getByRole("link", {name: "Download"})).toHaveAttribute("href", expect.stringContaining("/books/orchard/download?format=MP3"));
        expect(screen.getByRole("link", {name: "Download"})).toHaveAttribute("download", "The Orchard, narrated.mp3");
        expect(screen.getByRole("heading", {level: 1, name: "The Orchard, narrated"})).toBeVisible();
    });

    it("offers Continue reading and keeps local reading state after cloud reset failure", async () => {
        localStorage.setItem("currentlyReading_owner", JSON.stringify({orchard: true}));
        api.deletePosition.mockRejectedValue(new Error("offline"));
        renderBook();
        expect(screen.getByRole("link", {name: "Continue reading"})).toHaveAttribute("href", "/books/orchard/read?format=EPUB");
        fireEvent.click(screen.getByText("Book tools and maintenance"));
        fireEvent.click(screen.getByRole("button", {name: "Reset reading position"}));
        const dialog = await screen.findByRole("alertdialog", {name: "Reset reading position for The Orchard?"});
        expect(dialog).toHaveAccessibleDescription(/on this device and in the cloud/);
        fireEvent.click(within(dialog).getByRole("button", {name: "Reset reading position"}));
        expect(await within(dialog).findByRole("alert")).toBeVisible();
        expect(JSON.parse(localStorage.getItem("currentlyReading_owner")!)).toEqual({orchard: true});
    });

    it("does not offer deletion or format changes to a non-owner", () => {
        sessionStorage.setItem("user_id", "someone-else");
        renderBook();
        fireEvent.click(screen.getByText("Book tools and maintenance"));
        expect(screen.queryByRole("button", {name: "Delete book"})).not.toBeInTheDocument();
        expect(screen.getByText("Format maintenance read only")).toBeVisible();
    });

    it("keeps a failed book deletion open with an explicit consequence", async () => {
        api.deleteBook.mockReturnValue({unwrap: () => Promise.reject(new Error("offline"))});
        renderBook();
        fireEvent.click(screen.getByText("Book tools and maintenance"));
        fireEvent.click(screen.getByRole("button", {name: "Delete book"}));
        const dialog = await screen.findByRole("alertdialog", {name: "Delete The Orchard?"});
        expect(dialog).toHaveAccessibleDescription(/book and its files.*cannot be undone/);
        fireEvent.click(within(dialog).getByRole("button", {name: "Delete book"}));
        expect(await within(dialog).findByRole("alert")).toHaveTextContent("could not be saved");
        expect(dialog).toBeVisible();
    });

    it("keeps the cover search draft and distinguishes request failure from no covers", async () => {
        api.covers.mockReturnValue({unwrap: () => Promise.reject(new Error("offline"))});
        renderBook();
        fireEvent.click(screen.getByText("Book tools and maintenance"));
        fireEvent.click(screen.getByRole("button", {name: "Find a cover"}));
        const dialog = await screen.findByRole("dialog", {name: "Find a book cover"});
        expect(await within(dialog).findByRole("alert")).toHaveTextContent("could not be loaded");
        expect(within(dialog).queryByText("No covers found")).not.toBeInTheDocument();
        const field = within(dialog).getByRole("textbox", {name: "Search covers"});
        fireEvent.change(field, {target: {value: "My edited search"}});
        fireEvent.click(within(dialog).getByRole("button", {name: "Search"}));
        await waitFor(() => expect(within(dialog).getByRole("alert")).toHaveTextContent("Your search has been kept"));
        expect(field).toHaveValue("My edited search");
    });

    it("reports failed favorites inline without pretending success", async () => {
        api.favorite.mockReturnValue({unwrap: () => Promise.reject(new Error("offline"))});
        renderBook();
        fireEvent.click(screen.getByRole("button", {name: "Favorite"}));
        expect(await screen.findByRole("alert")).toHaveTextContent("favorite could not be updated");
        expect(screen.getByRole("button", {name: "Favorite"})).toHaveAttribute("aria-pressed", "false");
    });

    it("hands missing Kindle setup to the exact existing settings section", () => {
        renderBook();
        fireEvent.click(screen.getByRole("button", {name: "Set up Kindle"}));
        expect(screen.getByRole("status", {name: "Current location"})).toHaveTextContent("/settings?section=kindle");
        expect(api.send).not.toHaveBeenCalled();
    });

    it("keeps Kindle delivery on the EPUB-capable book contract when audio is selected", async () => {
        api.kindle.kindleEmail = "reader@kindle.example";
        api.send.mockReturnValue({unwrap: () => Promise.reject(new Error("offline"))});
        renderBook();
        fireEvent.click(screen.getByRole("button", {name: "MP3 audiobook"}));
        fireEvent.click(screen.getByRole("button", {name: "Send to Kindle"}));
        expect(api.send).toHaveBeenCalledWith("orchard");
        expect(await screen.findByRole("alert")).toHaveTextContent("Delivery failed");
        expect(screen.getByRole("link", {name: "Listen"})).toHaveAttribute("href", "/books/orchard/read?format=MP3");
    });
});
