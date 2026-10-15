import {fireEvent, render, screen} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {MemoryRouter, Route, Routes} from "react-router";
import {Provider} from "@/shared/ui/provider";
import Library from "./library";
import Favorites from "./favorites";
import BookShelf from "./book-shelf";
import CurrentlyReading from "./currently-reading";

const mocks = vi.hoisted(() => ({
    result: {} as Record<string, unknown>,
    shelfResult: {} as Record<string, unknown>,
    query: "",
    refetch: vi.fn(),
    shelfBooks: vi.fn(),
    discovery: {} as Record<string, unknown>,
    retryDiscovery: vi.fn(),
}));
vi.mock("@/components/navigation/MobileNavContext", () => ({useMobileNavConfig: vi.fn()}));
vi.mock("@/features/library", async importOriginal => ({
    ...await importOriginal<typeof import("@/features/library")>(),
    CollectionToolbar: () => <div>Collection controls</div>,
    useLibrarySearch: () => mocks.query,
    useLibraryDisplayMode: () => "grid",
    useShowAllUsers: () => false,
}));
vi.mock("@/entities/book", async () => ({
    ...await import("@/entities/book/ui/BookCard"),
    useGetBooksInfiniteQuery: () => mocks.result,
    useGetFavoriteBooksInfiniteQuery: () => mocks.result,
    useGetBooksByIdsQuery: () => mocks.result,
    AddBookButton: () => <button>Add books</button>,
}));
vi.mock("@/features/reader", () => ({
    useStorageLocations: () => mocks.discovery,
    getStoredProgress: vi.fn(),
    ReadingProgressBadge: () => <span>Reading progress</span>,
    StorageIndicator: () => <span>Local storage</span>,
}));
vi.mock("@/entities/bookShelf", () => ({
    useGetBookShelfBooksInfiniteQuery: (args: unknown) => {mocks.shelfBooks(args); return mocks.result;},
    useGetBookShelfByIdQuery: () => mocks.shelfResult,
    ManageBookShelfBooksButton: () => <button>Add books</button>,
    BookShelfOptionsMenu: () => <button>Shelf options</button>,
}));

function renderPage(node: React.ReactNode, path = "/") {
    return render(<Provider forcedTheme="light"><MemoryRouter initialEntries={[path]}>
        <Routes><Route path="*" element={node}/><Route path="/book-shelves/:bookShelfId" element={node}/></Routes>
    </MemoryRouter></Provider>);
}

beforeEach(() => {
    const storedValues = new Map<string, string>();
    vi.stubGlobal("localStorage", {
        getItem: (key: string) => storedValues.get(key) ?? null,
        setItem: (key: string, value: string) => storedValues.set(key, value),
        removeItem: (key: string) => storedValues.delete(key),
    });
    mocks.query = "";
    mocks.refetch.mockClear();
    mocks.shelfBooks.mockClear();
    mocks.retryDiscovery.mockClear();
    sessionStorage.setItem("user_id", "test-user");
    localStorage.removeItem("currentlyReading_test-user");
    mocks.result = {currentData: {pages: [{data: [], total: 0}]}, isError: false, isFetching: false, refetch: mocks.refetch};
    mocks.shelfResult = {data: {id: "shelf-1", title: "For winter"}, refetch: mocks.refetch};
    mocks.discovery = {allBookIds: [], locations: {}, discoveryError: false, isLoading: false, retry: mocks.retryDiscovery};
});
afterEach(() => vi.unstubAllGlobals());

describe("collection request states", () => {
    it("exposes the existing upload action in the main library header", () => {
        renderPage(<Library/>);
        expect(screen.getByRole("banner")).toContainElement(screen.getByRole("button", {name: "Add books"}));
    });

    it("shows failure and retry instead of an empty library", () => {
        mocks.result = {isError: true, isFetching: false, refetch: mocks.refetch};
        renderPage(<Library/>);
        expect(screen.getByRole("alert")).toHaveTextContent("Your library could not be loaded");
        expect(screen.queryByText("Your library is ready for its first book")).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", {name: "Try again"}));
        expect(mocks.refetch).toHaveBeenCalledOnce();
    });

    it("distinguishes no favorites from no search matches", () => {
        const {unmount} = renderPage(<Favorites/>);
        expect(screen.getByRole("heading", {name: "No favorites yet"})).toBeVisible();
        unmount();
        mocks.query = "isbn:9780";
        renderPage(<Favorites/>, "/favorites?q=isbn%3A9780");
        expect(screen.getByRole("heading", {name: "No matches in this collection"})).toBeVisible();
        fireEvent.click(screen.getByRole("button", {name: "Clear search"}));
        expect(screen.queryByRole("button", {name: "Clear search"})).not.toBeInTheDocument();
    });

    it("trusts server keyword matches on a shelf instead of title-only filtering", () => {
        mocks.query = "isbn:9780";
        mocks.result = {...mocks.result, currentData: {pages: [{data: [{id: "book-1", title: "A Winter Story", author: "A. Writer"}], total: 1}]}};
        renderPage(<BookShelf/>, "/book-shelves/shelf-1?q=isbn%3A9780");
        expect(mocks.shelfBooks).toHaveBeenCalledWith({bookShelfId: "shelf-1", query: "isbn:9780"});
        expect(screen.getByRole("link", {name: "View A Winter Story"})).toBeVisible();
        expect(screen.getByRole("button", {name: "Add books"})).toBeVisible();
    });

    it("does not redirect an unavailable shelf or report it as empty", () => {
        mocks.shelfResult = {isError: true, refetch: mocks.refetch};
        renderPage(<BookShelf/>, "/book-shelves/shelf-1");
        expect(screen.getByRole("alert")).toHaveTextContent("This shelf could not be loaded");
        expect(screen.queryByText("This shelf is ready for books")).not.toBeInTheDocument();
    });

    it("shows cloud discovery failure and retry rather than an empty continue-reading collection", () => {
        mocks.result = {isFetching: false, isError: false};
        mocks.discovery = {...mocks.discovery, discoveryError: true};
        renderPage(<CurrentlyReading/>);
        expect(screen.getByRole("alert")).toHaveTextContent("Cloud reading progress could not be checked");
        expect(screen.queryByText("Your next chapter is waiting")).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", {name: "Try again"}));
        expect(mocks.retryDiscovery).toHaveBeenCalledOnce();
    });

    it("retains local in-progress books while warning that cloud discovery failed", () => {
        localStorage.setItem("currentlyReading_test-user", JSON.stringify({"local-book": {}}));
        mocks.result = {currentData: [{id: "local-book", title: "A Local Story", author: "A. Writer"}]};
        mocks.discovery = {...mocks.discovery, allBookIds: ["local-book"], locations: {"local-book": "local"}, discoveryError: true};
        renderPage(<CurrentlyReading/>);
        expect(screen.getByRole("alert")).toHaveTextContent("Books saved on this device are still available below");
        expect(screen.getByRole("link", {name: "View A Local Story"})).toBeVisible();
        expect(screen.getByText("Local storage")).toBeVisible();
    });

    it("does not announce an empty collection while saved-progress discovery is pending", () => {
        mocks.result = {isFetching: false, isError: false};
        mocks.discovery = {...mocks.discovery, isLoading: true};
        renderPage(<CurrentlyReading/>);
        expect(screen.getByRole("status")).toHaveTextContent("Checking saved reading progress...");
        expect(screen.queryByText("Your next chapter is waiting")).not.toBeInTheDocument();
    });
});
