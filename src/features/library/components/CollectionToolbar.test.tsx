import {configureStore} from "@reduxjs/toolkit";
import {fireEvent, render, screen} from "@testing-library/react";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {Provider as ReduxProvider} from "react-redux";
import {MemoryRouter, useLocation} from "react-router";
import {Provider} from "@/shared/ui/provider";
import reducer from "../store/librarySlice";
import {CollectionToolbar} from "./CollectionToolbar";

const config = vi.hoisted(() => ({cloudMode: false}));
vi.mock("@/shared/config", () => ({config}));

function Location() {
    return <output aria-label="Location">{useLocation().search}</output>;
}

function renderToolbar() {
    const store = configureStore({reducer: {library: reducer}});
    render(<Provider forcedTheme="light"><ReduxProvider store={store}><MemoryRouter initialEntries={["/?sort=title"]}>
        <CollectionToolbar label="Search library" scope/><Location/>
    </MemoryRouter></ReduxProvider></Provider>);
    return store;
}

beforeEach(() => {
    sessionStorage.clear();
    config.cloudMode = false;
});

describe("collection toolbar", () => {
    it("labels visible search, accepts keyword syntax and preserves other URL state", () => {
        renderToolbar();
        fireEvent.change(screen.getByRole("searchbox", {name: "Search library"}), {target: {value: "isbn:9780"}});
        expect(screen.getByLabelText("Location")).toHaveTextContent("sort=title&q=isbn%3A9780");
        fireEvent.click(screen.getByRole("button", {name: "Clear search"}));
        expect(screen.getByRole("searchbox")).toHaveValue("");
        expect(screen.getByLabelText("Location")).toHaveTextContent("?sort=title");
    });

    it("keeps display and authorized scope changes in the existing preference store", () => {
        const store = renderToolbar();
        fireEvent.click(screen.getByRole("button", {name: "List"}));
        expect(store.getState().library.displayMode).toBe("table");
        expect(screen.getByRole("button", {name: "List"})).toHaveAttribute("aria-pressed", "true");
        fireEvent.click(screen.getByRole("button", {name: "Show all users' books"}));
        expect(store.getState().library.showAllUsers).toBe(true);
        expect(screen.getByRole("button", {name: "Show only my books"})).toHaveTextContent("All Libraries");
    });

    it("does not offer wider-library scope to an ordinary Cloud user", () => {
        config.cloudMode = true;
        sessionStorage.setItem("user_role", "USER");
        renderToolbar();
        expect(screen.queryByRole("button", {name: "Show all users' books"})).not.toBeInTheDocument();
        expect(screen.getByRole("searchbox", {name: "Search library"})).toBeVisible();
    });
});
