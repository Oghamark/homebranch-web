import {fireEvent, render, screen} from "@testing-library/react";
import {describe, expect, it, vi} from "vitest";
import {MemoryRouter} from "react-router";
import {Provider} from "@/shared/ui/provider";
import {LibraryPage} from "./LibraryPage";
import {BookCard} from "@/entities/book/ui/BookCard";
import type {BookModel} from "@/entities/book";

vi.mock("@/entities/book", async () => ({
    ...await import("@/entities/book/ui/BookCard"),
}));

const book = {id: "one", title: "The Long Way Home", author: "A. Writer", publishedYear: 2025} as BookModel;
function renderUI(node: React.ReactNode) {
    return render(<Provider forcedTheme="light"><MemoryRouter>{node}</MemoryRouter></Provider>);
}

describe("book collections", () => {
    it("keeps loaded books visible after a pagination failure and offers retry", () => {
        const fetchMore = vi.fn();
        renderUI(<LibraryPage books={[book]} hasMore fetchMore={fetchMore} totalBooks={40} loadMoreError/>);
        expect(screen.getByRole("link", {name: "View The Long Way Home"})).toBeVisible();
        expect(screen.getByRole("alert")).toHaveTextContent("More books could not be loaded");
        fireEvent.click(screen.getByRole("button", {name: "Try again"}));
        expect(fetchMore).toHaveBeenCalledOnce();
    });

    it("announces incremental loading and retains private book badges in list view", () => {
        renderUI(<LibraryPage books={[book]} hasMore fetchMore={() => {}} displayMode="table" loadingMore
            getBookBadge={() => <span>42% read, local storage</span>}/>);
        expect(screen.getByText("Loading more books...")).toBeVisible();
        expect(screen.getByRole("table")).toHaveTextContent("42% read, local storage");
        expect(screen.getByRole("link", {name: book.title})).toHaveAttribute("href", "/books/one");
    });

    it("provides an explicit load-more fallback", () => {
        const fetchMore = vi.fn();
        renderUI(<LibraryPage books={[book]} hasMore fetchMore={fetchMore}/>);
        fireEvent.click(screen.getByRole("button", {name: "Load more books"}));
        expect(fetchMore).toHaveBeenCalledOnce();
    });

    it("uses a typographic jacket for missing and broken cover art", () => {
        const {unmount} = renderUI(<BookCard book={book}/>);
        expect(screen.getByRole("link", {name: `View ${book.title}`})).toHaveTextContent(book.title);
        expect(screen.queryByRole("img")).not.toBeInTheDocument();
        unmount();
        renderUI(<BookCard book={{...book, coverImageFileName: "broken.jpg"}}/>);
        const cover = document.querySelector("img");
        expect(cover).not.toBeNull();
        fireEvent.error(cover!);
        expect(screen.getByRole("link", {name: `View ${book.title}`})).toHaveTextContent(book.title);
    });
});
