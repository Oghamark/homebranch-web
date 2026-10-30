import {render, screen} from "@testing-library/react";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {MemoryRouter} from "react-router";
import {Provider} from "@/shared/ui/provider";
import {installMemoryStorage} from "@/test/memoryStorage";
import Dashboard from "./dashboard";

const mocks = vi.hoisted(() => ({
    recent: {} as Record<string, any>,
    favorites: {} as Record<string, any>,
    reading: {} as Record<string, any>,
    recommendations: {} as Record<string, any>,
    discovery: {} as Record<string, any>,
    recommendationArgs: vi.fn(),
}));

vi.mock("@/components/navigation/MobileNavContext", () => ({useMobileNavConfig: vi.fn()}));
vi.mock("@/entities/book", async importOriginal => ({
    ...await importOriginal<typeof import("@/entities/book")>(),
    useGetBooksInfiniteQuery: () => mocks.recent,
    useGetFavoriteBooksInfiniteQuery: () => mocks.favorites,
    useGetBooksByIdsQuery: () => mocks.reading,
    useSearchBooksQuery: (args: unknown) => {mocks.recommendationArgs(args); return mocks.recommendations;},
}));
vi.mock("@/entities/book/ui/AddBookButton", () => ({AddBookButton: () => <button>Add books</button>}));
vi.mock("@/features/reader", () => ({useStorageLocations: () => mocks.discovery}));

function book(id: string, title: string, genres: string[] = []) {
    return {id, title, author: "A. Writer", fileName: `${id}.epub`, isFavorite: false, uploadedByUserId: "owner", genres};
}

function renderDashboard() {
    return render(<Provider forcedTheme="light"><MemoryRouter><Dashboard/></MemoryRouter></Provider>);
}

beforeEach(() => {
    installMemoryStorage();
    sessionStorage.setItem("user_id", "dashboard-user");
    localStorage.removeItem("currentlyReading_dashboard-user");
    mocks.recent = {currentData: {pages: [{data: [book("recent-1", "New Addition")]}]}, isFetching: false, isError: false, refetch: vi.fn()};
    mocks.favorites = {currentData: {pages: [{data: [book("favorite-1", "Favorite", ["Fantasy"])]}]}};
    mocks.reading = {currentData: [book("reading-1", "In Progress")], isFetching: false, isError: false, refetch: vi.fn()};
    mocks.recommendations = {
        currentData: [book("favorite-1", "Favorite"), book("recent-1", "New Addition"), book("reading-1", "In Progress"), book("recommended-1", "Suggested Read")],
        isFetching: false, isError: false, refetch: vi.fn(),
    };
    mocks.discovery = {allBookIds: ["reading-1"], isLoading: false, discoveryError: false, retry: vi.fn()};
    mocks.recommendationArgs.mockClear();
});

describe("dashboard", () => {
    it("shows in-progress and recent books and recommends an unseen book in a favorite genre", () => {
        localStorage.setItem("currentlyReading_dashboard-user", JSON.stringify({"reading-1": {}}));
        renderDashboard();

        expect(screen.getByRole("heading", {name: "Continue reading"})).toBeVisible();
        expect(screen.getByRole("link", {name: "View In Progress"})).toBeVisible();
        expect(screen.getByRole("link", {name: "View New Addition"})).toBeVisible();
        expect(screen.getByRole("link", {name: "View Suggested Read"})).toBeVisible();
        expect(screen.queryByRole("link", {name: "View Favorite"})).not.toBeInTheDocument();
        expect(mocks.recommendationArgs).toHaveBeenCalledWith({query: "genre:Fantasy", userId: "dashboard-user"});
    });

    it("prompts the reader to favorite a book before showing interest-based recommendations", () => {
        mocks.favorites = {currentData: {pages: [{data: []}]}};
        mocks.reading = {currentData: [], isFetching: false, isError: false, refetch: vi.fn()};
        mocks.recommendations = {currentData: [], isFetching: false, isError: false, refetch: vi.fn()};
        mocks.discovery = {allBookIds: [], isLoading: false, discoveryError: false, retry: vi.fn()};
        renderDashboard();

        expect(screen.getByRole("heading", {name: "Build your recommendations"})).toBeVisible();
        expect(screen.getByText("Favorite a book or start reading to get recommendations based on your interests.")).toBeVisible();
    });
});
