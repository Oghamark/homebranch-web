import {fireEvent, render, screen} from "@testing-library/react";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {MemoryRouter} from "react-router";
import {Provider} from "@/shared/ui/provider";
import {NavigationContent} from "./NavigationContent";

const mocks = vi.hoisted(() => ({submit: vi.fn(), cloudMode: false, toggleColorMode: vi.fn(), unread: 0, notificationsError: false}));
vi.mock("@/entities/book", () => ({AddBookButton: () => <button>Add books</button>}));
vi.mock("@/entities/bookShelf", () => ({BookShelfNavigationSection: () => <div>Bookshelves</div>}));
vi.mock("@/shared/config", () => ({config: {get cloudMode() {return mocks.cloudMode;}}}));
vi.mock("@/entities/social/api", () => ({
    notificationRefresh: {pollingInterval: 30_000},
    useGetUnreadNotificationCountQuery: () => ({currentData: {count: mocks.unread}, error: mocks.notificationsError}),
}));
vi.mock("@/shared/ui/color-mode", async importOriginal => ({
    ...await importOriginal<typeof import("@/shared/ui/color-mode")>(),
    useColorMode: () => ({colorMode: "light", toggleColorMode: mocks.toggleColorMode}),
    ColorModeIcon: () => <span/>,
}));
vi.mock("react-router", async importOriginal => ({
    ...await importOriginal<typeof import("react-router")>(),
    useFetcher: () => ({state: "idle", submit: mocks.submit}),
}));

function renderNavigation(path = "/") {
    return render(<Provider forcedTheme="light"><MemoryRouter initialEntries={[path]}><NavigationContent/></MemoryRouter></Provider>);
}

beforeEach(() => {
    sessionStorage.clear();
    mocks.cloudMode = false;
    mocks.unread = 0; mocks.notificationsError = false;
    vi.clearAllMocks();
});

describe("reading navigation", () => {
    it("uses named route links with a current destination, not tabs or sidebar search", () => {
        renderNavigation("/book-clubs/club-1");
        expect(screen.getByRole("link", {name: "Book clubs"})).toHaveAttribute("aria-current", "page");
        expect(screen.getByRole("link", {name: "Continue reading"})).toHaveAttribute("href", "/currently-reading");
        expect(screen.queryByRole("tab")).not.toBeInTheDocument();
        expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
    });

    it("preserves ordinary Cloud account boundaries", () => {
        mocks.cloudMode = true;
        sessionStorage.setItem("user_role", "USER");
        renderNavigation();
        expect(screen.queryByRole("link", {name: "Library management"})).not.toBeInTheDocument();
        expect(screen.queryByRole("link", {name: "User management"})).not.toBeInTheDocument();
        expect(screen.getByRole("link", {name: "Settings"})).toBeVisible();
    });

    it("preserves self-hosted library tools and administrator destinations", () => {
        sessionStorage.setItem("user_role", "ADMIN");
        renderNavigation("/users");
        expect(screen.getByRole("link", {name: "Library management"})).toBeVisible();
        expect(screen.getByRole("link", {name: "User management"})).toHaveAttribute("aria-current", "page");
        fireEvent.click(screen.getByRole("button", {name: "Log out"}));
        expect(mocks.submit).toHaveBeenCalledWith("", {method: "post", action: "/logout"});
    });
    it("links social destinations and labels the unread notification count", () => {
        mocks.unread = 7;
        renderNavigation("/notifications");
        expect(screen.getByRole("link", {name: "Friends"})).toHaveAttribute("href", "/friends");
        expect(screen.getByRole("link", {name: /Notifications/})).toHaveAttribute("aria-current", "page");
        expect(screen.getByLabelText("7 unread notifications")).toHaveTextContent("7");
    });
    it("shows unavailable rather than a stale or falsely zero unread count", () => {
        mocks.unread = 7; mocks.notificationsError = true;
        renderNavigation();
        expect(screen.getByLabelText("Unread count unavailable")).toBeVisible();
        expect(screen.queryByLabelText("7 unread notifications")).not.toBeInTheDocument();
    });
});
