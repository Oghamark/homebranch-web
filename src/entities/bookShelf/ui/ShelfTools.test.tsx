import {fireEvent, render, screen, waitFor, within} from "@testing-library/react";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {MemoryRouter} from "react-router";
import {Provider} from "@/shared/ui/provider";
import {AddBookShelfButton} from "./AddBookShelfButton";
import {ManageBookShelvesButton} from "./ManageBookShelvesButton";
import {BookShelfOptionsMenu} from "./BookShelfOptionsMenu";
import {ManageBookShelfBooksButton} from "./ManageBookShelfBooksButton";

const api = vi.hoisted(() => ({
    create: vi.fn(), removeShelf: vi.fn(), add: vi.fn(), remove: vi.fn(), refetch: vi.fn(),
    queryFailed: false,
    booksFailed: false, moreFailed: false, nextPage: vi.fn(),
}));
vi.mock("@/entities/book", () => ({
    useGetBooksInfiniteQuery: () => ({
        data: api.booksFailed ? undefined : {pages: [{data: [{id: "book", title: "The Orchard", author: "Writer", fileName: "book.epub", isFavorite: false, uploadedByUserId: "reader"}]}]},
        isLoading: false, isError: api.booksFailed || api.moreFailed, hasNextPage: api.moreFailed,
        fetchNextPage: api.nextPage, refetch: api.refetch,
    }),
}));
vi.mock("@/entities/bookShelf", () => ({
    useCreateBookShelfMutation: () => [api.create, {isLoading: false}],
    useDeleteBookShelfMutation: () => [api.removeShelf, {isLoading: false}],
    useAddBookToBookShelfMutation: () => [api.add],
    useRemoveBookFromBookShelfMutation: () => [api.remove],
    useGetBookShelvesQuery: () => ({data: [{id: "shelf", title: "Weekend"}], isError: api.queryFailed, refetch: api.refetch}),
    useGetBookShelvesByBookQuery: () => ({data: [], isError: false, refetch: api.refetch}),
}));

beforeEach(() => {
    vi.resetAllMocks();
    api.queryFailed = false;
    api.booksFailed = false;
    api.moreFailed = false;
});
const renderUI = (children: React.ReactNode) => render(<Provider><MemoryRouter>{children}</MemoryRouter></Provider>);

describe("shelf tools", () => {
    it("creates explicitly, never on blur, and keeps the name after failure", async () => {
        api.create.mockReturnValueOnce({unwrap: () => Promise.reject(new Error("offline"))})
            .mockReturnValueOnce({unwrap: () => Promise.resolve({id: "new"})});
        renderUI(<AddBookShelfButton/>);
        fireEvent.click(screen.getByRole("button", {name: "Add shelf"}));
        const field = screen.getByRole("textbox", {name: "Shelf name"});
        fireEvent.change(field, {target: {value: " Weekend "}});
        fireEvent.blur(field);
        expect(api.create).not.toHaveBeenCalled();
        fireEvent.click(screen.getByRole("button", {name: "Create shelf"}));
        expect(await screen.findByRole("alert")).toHaveTextContent("Your name has been kept");
        expect(field).toHaveValue(" Weekend ");
        fireEvent.click(screen.getByRole("button", {name: "Create shelf"}));
        await screen.findByRole("button", {name: "Add shelf"});
        expect(api.create).toHaveBeenLastCalledWith({title: "Weekend"});
    });

    it("distinguishes failed shelf requests from an empty list", async () => {
        api.queryFailed = true;
        renderUI(<ManageBookShelvesButton bookId="book"/>);
        fireEvent.click(screen.getByRole("button", {name: "Manage shelves"}));
        expect(await screen.findByRole("alert")).toHaveTextContent("Shelves could not be loaded");
        expect(screen.queryByText("No shelves created yet")).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", {name: "Try again"}));
        expect(api.refetch).toHaveBeenCalledTimes(2);
    });

    it("keeps the membership popover open with a useful mutation failure", async () => {
        api.add.mockReturnValue({unwrap: () => Promise.reject(new Error("offline"))});
        renderUI(<ManageBookShelvesButton bookId="book"/>);
        fireEvent.click(screen.getByRole("button", {name: "Manage shelves"}));
        const checkbox = await screen.findByRole("checkbox", {name: "Weekend"});
        fireEvent.click(checkbox);
        expect(await screen.findByRole("alert")).toHaveTextContent("Shelf membership could not be saved");
        await waitFor(() => expect(checkbox).not.toBeChecked());
        expect(api.add).toHaveBeenCalledWith({shelfId: "shelf", bookId: "book"});
    });

    it("confirms shelf-only deletion and keeps a failed confirmation open", async () => {
        api.removeShelf.mockReturnValue({unwrap: () => Promise.reject(new Error("offline"))});
        renderUI(<BookShelfOptionsMenu bookShelfId="shelf" bookShelfTitle="Weekend"/>);
        fireEvent.click(screen.getByRole("button", {name: "Delete shelf Weekend"}));
        const dialog = await screen.findByRole("alertdialog", {name: "Delete shelf Weekend?"});
        expect(dialog).toHaveAccessibleDescription(/books and their files will stay in your library/);
        fireEvent.click(within(dialog).getByRole("button", {name: "Delete shelf"}));
        await waitFor(() => expect(within(dialog).getByRole("alert")).toHaveTextContent("could not be saved"));
        expect(dialog).toBeVisible();
    });

    it("names shelf book actions and preserves a search after a failed membership change", async () => {
        api.add.mockReturnValue({unwrap: () => Promise.reject(new Error("offline"))});
        renderUI(<ManageBookShelfBooksButton bookShelf={{id: "shelf", title: "Weekend", books: []}}/>);
        fireEvent.click(screen.getByRole("button", {name: "Add or remove books"}));
        const dialog = await screen.findByRole("dialog", {name: "Books on Weekend"});
        const search = within(dialog).getByRole("textbox", {name: "Search library"});
        fireEvent.change(search, {target: {value: "Orchard"}});
        fireEvent.click(within(dialog).getByRole("button", {name: "Add The Orchard to Weekend"}));
        expect(await within(dialog).findByRole("alert")).toHaveTextContent("The shelf could not be updated");
        expect(search).toHaveValue("Orchard");
        expect(api.add).toHaveBeenCalledWith({shelfId: "shelf", bookId: "book"});
    });

    it("distinguishes a library failure from emptiness and keeps earlier results after a load-more failure", async () => {
        api.booksFailed = true;
        const {unmount} = renderUI(<ManageBookShelfBooksButton bookShelf={{id: "shelf", title: "Weekend", books: []}}/>);
        fireEvent.click(screen.getByRole("button", {name: "Add or remove books"}));
        const dialog = await screen.findByRole("dialog", {name: "Books on Weekend"});
        expect(within(dialog).getByRole("alert")).toHaveTextContent("Your books could not be loaded");
        expect(within(dialog).queryByText("No books in your library")).not.toBeInTheDocument();
        unmount();
        api.booksFailed = false;
        api.moreFailed = true;
        renderUI(<ManageBookShelfBooksButton bookShelf={{id: "shelf", title: "Weekend", books: []}}/>);
        fireEvent.click(screen.getByRole("button", {name: "Add or remove books"}));
        const withResults = await screen.findByRole("dialog", {name: "Books on Weekend"});
        expect(within(withResults).getByRole("button", {name: "Add The Orchard to Weekend"})).toBeVisible();
        expect(within(withResults).getByRole("alert")).toHaveTextContent("More books could not be loaded");
        fireEvent.click(within(withResults).getByRole("button", {name: "Try again"}));
        expect(api.nextPage).toHaveBeenCalledOnce();
    });
});
