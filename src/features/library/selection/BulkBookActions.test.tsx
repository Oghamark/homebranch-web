import {fireEvent, render, screen, waitFor, within} from "@testing-library/react";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {MemoryRouter} from "react-router";
import {Provider} from "@/shared/ui/provider";
import {LibraryPage} from "@/pages/library/ui/LibraryPage";
import type {BookModel} from "@/entities/book";
import type {BulkBooksRequest} from "@/entities/book/api/api";
import {BookSelectionProvider, useBookSelection} from "./BookSelectionContext";
import {BulkBookActions} from "./BulkBookActions";

const api = vi.hoisted(() => ({
    bulk: vi.fn(), shelfError: false, userError: false, retryShelves: vi.fn(), retryUsers: vi.fn(), toast: vi.fn(),
}));
vi.mock("@/entities/book", async () => ({...await import("@/entities/book/ui/BookCard")}));
vi.mock("@/entities/book/api/api", () => ({useBulkBooksMutation: () => [api.bulk]}));
vi.mock("@/entities/bookShelf", () => ({
    useGetBookShelvesQuery: () => ({data: [{id: "shelf", title: "Weekend reads"}], isFetching: false, isError: api.shelfError, refetch: api.retryShelves}),
}));
vi.mock("@/entities/user", () => ({
    useGetUsersQuery: () => ({data: [{id: "new-owner", name: "New owner", email: "new@example.test"}], isFetching: false, isError: api.userError, refetch: api.retryUsers}),
}));
vi.mock("@/shared/lib/toast/toast", () => ({default: api.toast}));

const first: BookModel = {id: "first", title: "First Book", author: "Writer", fileName: "first.epub", isFavorite: false, uploadedByUserId: "owner"};
const second: BookModel = {...first, id: "second", title: "Second Book"};

function TestSelection({books}: {books: BookModel[]}) {
    const selection = useBookSelection();
    return <button onClick={() => selection?.toggleDisplayed(books)}>Select test books</button>;
}

function Frame({books = [first, second], table = false, account = "owner", setupBooks}: {
    books?: BookModel[]; table?: boolean; account?: string; setupBooks?: BookModel[];
}) {
    return <Provider><MemoryRouter><BookSelectionProvider key={account}>
        <BulkBookActions/>
        {setupBooks ? <TestSelection books={setupBooks}/> : books.length > 0
            ? <LibraryPage books={books} hasMore={false} fetchMore={() => {}} displayMode={table ? "table" : "grid"}/>
            : <p>No filtered results</p>}
    </BookSelectionProvider></MemoryRouter></Provider>;
}

async function toggleCheckbox(name: string) {
    const checkbox = screen.getByRole("checkbox", {name});
    const label = checkbox.closest("label")!;
    const checked = label.getAttribute("data-state") === "checked";
    fireEvent.click(checkbox);
    await waitFor(() => expect(label).toHaveAttribute("data-state", checked ? "unchecked" : "checked"));
}

async function selectDisplayed() {
    await toggleCheckbox("Select displayed books");
}

async function chooseAction(label: string) {
    const trigger = screen.getByRole("button", {name: "Choose bulk action"});
    fireEvent.click(trigger);
    await waitFor(() => expect(trigger).toHaveAttribute("aria-expanded", "true"));
    const item = await screen.findByRole("menuitem", {name: label});
    fireEvent.pointerDown(item);
    await waitFor(() => expect(item).toHaveAttribute("data-highlighted"));
    fireEvent.click(item);
    await waitFor(() => {
        expect(trigger).toHaveTextContent(label);
        expect(trigger).not.toHaveAttribute("aria-expanded", "true");
    });
    await waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument());
}

async function applyAction(label: string) {
    await chooseAction(label);
    fireEvent.click(screen.getByRole("button", {name: "Apply"}));
}

beforeEach(() => {
    vi.clearAllMocks();
    api.shelfError = false; api.userError = false;
    sessionStorage.clear();
    sessionStorage.setItem("user_id", "owner");
    sessionStorage.setItem("user_role", "USER");
    api.bulk.mockImplementation((request: BulkBooksRequest) => ({
        unwrap: () => Promise.resolve({success: true, succeeded: request.bookIds, failed: []}),
    }));
});

describe("book multi-select", () => {
    it("selects directly from the cover without entering selection mode or opening the book", async () => {
        render(<Frame/>);
        expect(screen.queryByRole("button", {name: "Select books"})).not.toBeInTheDocument();
        expect(screen.queryByRole("button", {name: "Choose bulk action"})).not.toBeInTheDocument();
        const checkbox = screen.getByRole("checkbox", {name: "Select First Book"});
        const coverLink = screen.getByRole("link", {name: "View First Book"});
        expect(checkbox.closest("a")).toBeNull();
        expect(coverLink.parentElement).toContainElement(checkbox);
        await toggleCheckbox("Select First Book");
        fireEvent.mouseLeave(coverLink.parentElement!);
        await waitFor(() => expect(checkbox).toBeVisible());
        expect(screen.getByText("1 book selected")).toBeVisible();
        expect(screen.getByRole("button", {name: "Choose bulk action"})).toBeVisible();
        expect(screen.queryByRole("button", {name: "Delete selected books"})).not.toBeInTheDocument();
        await toggleCheckbox("Select First Book");
        await waitFor(() => expect(screen.queryByRole("button", {name: "Choose bulk action"})).not.toBeInTheDocument());
    });

    it("retains selection across filtered collections, empty results and grid/table changes without selecting hidden books", async () => {
        const {rerender} = render(<Frame books={[first]}/>);
        await selectDisplayed();
        await waitFor(() => expect(screen.getByRole("checkbox", {name: "Select First Book"})).toBeChecked());
        expect(screen.getByRole("link", {name: "View First Book"})).toHaveAttribute("href", "/books/first");
        rerender(<Frame books={[]}/>);
        expect(screen.getByText("1 book selected")).toBeVisible();
        rerender(<Frame books={[second]} table/>);
        expect(screen.getByRole("checkbox", {name: "Select Second Book"})).not.toBeChecked();
        await toggleCheckbox("Select displayed books");
        expect(screen.getByText("2 books selected")).toBeVisible();
        await toggleCheckbox("Select displayed books");
        expect(screen.getByText("1 book selected")).toBeVisible();
        await applyAction("Add to favorites");
        await waitFor(() => expect(api.bulk).toHaveBeenCalledWith({action: "favorite", bookIds: ["first"]}));
    });

    it("supports keyboard action selection and waits for Apply before changing books", async () => {
        render(<Frame/>);
        await toggleCheckbox("Select First Book");
        const trigger = screen.getByRole("button", {name: "Choose bulk action"});
        trigger.focus();
        fireEvent.keyDown(trigger, {key: "ArrowDown"});
        const menu = await screen.findByRole("menu");
        const favorite = within(menu).getByRole("menuitem", {name: "Add to favorites"});
        await waitFor(() => expect(menu).toHaveAttribute("aria-activedescendant", favorite.id));
        fireEvent.keyDown(menu, {key: "Enter"});
        await waitFor(() => expect(trigger).toHaveTextContent("Add to favorites"));
        expect(api.bulk).not.toHaveBeenCalled();
        fireEvent.click(screen.getByRole("button", {name: "Apply"}));
        await waitFor(() => expect(api.bulk).toHaveBeenCalledWith({action: "favorite", bookIds: ["first"]}));
    });

    it("reviews and removes hidden selections from the condensed selection count", async () => {
        const {rerender} = render(<Frame/>);
        await selectDisplayed();
        rerender(<Frame books={[second]}/>);
        fireEvent.click(screen.getByRole("button", {name: "2 books selected"}));
        fireEvent.click(await screen.findByRole("button", {name: "Deselect First Book"}));
        await waitFor(() => expect(screen.getByRole("button", {name: "1 book selected"})).toBeVisible());
        expect(screen.getByRole("checkbox", {name: "Select Second Book"})).toBeChecked();
        expect(screen.queryByRole("button", {name: "Deselect First Book"})).not.toBeInTheDocument();
    });

    it("confirms deletion, removes only successful selections, and retains individual failures for retry", async () => {
        api.bulk.mockReturnValue({unwrap: () => Promise.resolve({
            success: false, succeeded: ["first"], failed: [{bookId: "second", message: "Book not found"}],
        })});
        render(<Frame/>);
        await selectDisplayed();
        await chooseAction("Delete selected books");
        fireEvent.click(screen.getByRole("button", {name: "Delete selected books"}));
        const dialog = await screen.findByRole("alertdialog", {name: "Delete 2 selected books?"});
        expect(api.bulk).not.toHaveBeenCalled();
        expect(dialog).toHaveAccessibleDescription(/all of its formats/);
        fireEvent.click(within(dialog).getByRole("button", {name: "Delete selected books"}));
        await waitFor(() => expect(api.bulk).toHaveBeenCalledWith({action: "delete", bookIds: ["first", "second"]}));
        await waitFor(() => expect(screen.getByLabelText("Select First Book")).not.toBeChecked());
        expect(screen.getByLabelText("Select Second Book")).toBeChecked();
        expect(within(dialog).getByRole("alert")).toHaveTextContent("1 of 2 books updated; 1 failed");
        fireEvent.click(within(dialog).getByRole("button", {name: "Cancel"}));
        await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
        await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Second Book: Book not found"));
        api.bulk.mockImplementation((request: BulkBooksRequest) => ({
            unwrap: () => Promise.resolve({success: true, succeeded: request.bookIds, failed: []}),
        }));
        fireEvent.click(screen.getByRole("button", {name: "Delete selected books"}));
        const retry = await screen.findByRole("alertdialog");
        fireEvent.click(within(retry).getByRole("button", {name: "Delete selected books"}));
        await waitFor(() => expect(api.bulk).toHaveBeenLastCalledWith({action: "delete", bookIds: ["second"]}));
    });

    it("supports favorites and bookshelf membership without toggling unrelated books", async () => {
        render(<Frame/>);
        await selectDisplayed();
        await applyAction("Remove from favorites");
        await waitFor(() => expect(api.bulk).toHaveBeenLastCalledWith({action: "unfavorite", bookIds: ["first", "second"]}));
        await waitFor(() => expect(screen.queryByRole("button", {name: "Choose bulk action"})).not.toBeInTheDocument());
        await toggleCheckbox("Select First Book");
        await chooseAction("Add to bookshelf");
        fireEvent.change(screen.getByLabelText("Bulk action bookshelf"), {target: {value: "shelf"}});
        fireEvent.click(screen.getByRole("button", {name: "Apply"}));
        await waitFor(() => expect(api.bulk).toHaveBeenLastCalledWith({action: "add-to-shelf", bookIds: ["first"], shelfId: "shelf"}));
        await waitFor(() => expect(screen.queryByRole("button", {name: "Choose bulk action"})).not.toBeInTheDocument());
        await toggleCheckbox("Select Second Book");
        await applyAction("Remove from bookshelf");
        await waitFor(() => expect(api.bulk).toHaveBeenLastCalledWith({action: "remove-from-shelf", bookIds: ["second"], shelfId: "shelf"}));
    });

    it("prevents non-owner deletion and hides administrator ownership controls", async () => {
        render(<Frame books={[first, {...second, uploadedByUserId: "someone-else"}]}/>);
        await selectDisplayed();
        fireEvent.click(screen.getByRole("button", {name: "Choose bulk action"}));
        const menu = await screen.findByRole("menu");
        expect(within(menu).queryByRole("menuitem", {name: "Assign ownership"})).not.toBeInTheDocument();
        const deleteItem = within(menu).getByRole("menuitem", {name: "Delete selected books"});
        fireEvent.pointerDown(deleteItem);
        await waitFor(() => expect(deleteItem).toHaveAttribute("data-highlighted"));
        fireEvent.click(deleteItem);
        await waitFor(() => expect(screen.getByRole("button", {name: "Delete selected books"})).toBeDisabled());
        expect(screen.queryByLabelText("Bulk action owner")).not.toBeInTheDocument();
        await toggleCheckbox("Select Second Book");
        await waitFor(() => expect(screen.getByRole("button", {name: "Delete selected books"})).toBeEnabled());
    });

    it("confirms administrator ownership assignment, including no owner", async () => {
        sessionStorage.setItem("user_role", "ADMIN");
        render(<Frame/>);
        await selectDisplayed();
        await chooseAction("Assign ownership");
        fireEvent.change(screen.getByLabelText("Bulk action owner"), {target: {value: "unowned"}});
        fireEvent.click(screen.getByRole("button", {name: "Assign ownership"}));
        const dialog = await screen.findByRole("alertdialog");
        expect(dialog).toHaveAccessibleDescription(/no owner/);
        fireEvent.click(within(dialog).getByRole("button", {name: "Assign ownership"}));
        await waitFor(() => expect(api.bulk).toHaveBeenCalledWith({action: "assign-owner", bookIds: ["first", "second"], ownerId: null}));
    });

    it("batches selections larger than 100 and stops after an uncertain request without dropping remaining selections", async () => {
        const books = Array.from({length: 201}, (_, index) => ({...first, id: `book-${index}`, title: `Book ${index}`}));
        let resolveFirst: ((value: {success: boolean; succeeded: string[]; failed: []}) => void) | undefined;
        api.bulk.mockReturnValueOnce({unwrap: () => new Promise(resolve => {resolveFirst = resolve;})});
        api.bulk.mockReturnValueOnce({unwrap: () => Promise.reject({status: "FETCH_ERROR", error: "Network unavailable"})});
        render(<Frame setupBooks={books}/>);
        fireEvent.click(screen.getByRole("button", {name: "Select test books"}));
        await applyAction("Add to favorites");
        expect(screen.getByRole("button", {name: "Clear selection"})).toBeDisabled();
        expect(screen.getByRole("button", {name: "Choose bulk action"})).toBeDisabled();
        resolveFirst?.({success: true, succeeded: books.slice(0, 100).map(book => book.id), failed: []});
        await waitFor(() => expect(api.bulk).toHaveBeenCalledTimes(2));
        await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("100 of 201 books confirmed updated"));
        expect(screen.getByText("101 books selected")).toBeVisible();
        expect(api.bulk.mock.calls.map(([request]) => request.bookIds.length)).toEqual([100, 100]);
    });

    it("clears selection on account changes and supports explicit cancellation", async () => {
        const {rerender} = render(<Frame/>);
        await selectDisplayed();
        rerender(<Frame account="different-user"/>);
        expect(screen.queryByRole("button", {name: "Choose bulk action"})).not.toBeInTheDocument();
        await selectDisplayed();
        fireEvent.click(screen.getByRole("button", {name: "Clear selection"}));
        await waitFor(() => expect(screen.getByRole("checkbox", {name: "Select First Book"})).not.toBeChecked());
        expect(screen.queryByRole("button", {name: "Choose bulk action"})).not.toBeInTheDocument();
    });

    it("does not send later batches under a different account", async () => {
        const books = Array.from({length: 101}, (_, index) => ({...first, id: `book-${index}`}));
        let resolveFirst: ((value: {success: boolean; succeeded: string[]; failed: []}) => void) | undefined;
        api.bulk.mockReturnValueOnce({unwrap: () => new Promise(resolve => {resolveFirst = resolve;})});
        const {rerender} = render(<Frame setupBooks={books}/>);
        fireEvent.click(screen.getByRole("button", {name: "Select test books"}));
        await applyAction("Add to favorites");
        sessionStorage.setItem("user_id", "different-user");
        rerender(<Frame account="different-user"/>);
        resolveFirst?.({success: true, succeeded: books.slice(0, 100).map(book => book.id), failed: []});
        await waitFor(() => expect(api.toast).toHaveBeenCalledWith({
            message: "Bulk action stopped because your account changed. Review your library before retrying.", type: "error",
        }));
        expect(api.bulk).toHaveBeenCalledOnce();
        expect(screen.queryByRole("button", {name: "Choose bulk action"})).not.toBeInTheDocument();
    });

    it("surfaces bookshelf load failures without disabling other bulk actions", async () => {
        api.shelfError = true;
        render(<Frame/>);
        await selectDisplayed();
        await chooseAction("Add to bookshelf");
        expect(screen.getByRole("button", {name: "Apply"})).toBeDisabled();
        fireEvent.click(screen.getByRole("button", {name: "Try again"}));
        expect(api.retryShelves).toHaveBeenCalledOnce();
        await chooseAction("Add to favorites");
        expect(screen.getByRole("button", {name: "Apply"})).toBeEnabled();
    });
});
