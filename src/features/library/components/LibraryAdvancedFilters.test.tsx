import {fireEvent, render, screen} from "@testing-library/react";
import {describe, expect, it, vi} from "vitest";
import {MemoryRouter, useLocation} from "react-router";
import {Provider} from "@/shared/ui/provider";
import {LibraryAdvancedFilters} from "./LibraryAdvancedFilters";

const mocks = vi.hoisted(() => ({refetch: vi.fn()}));
vi.mock("@/entities/book", () => ({
    useGetGenresQuery: () => ({data: ["Fantasy", "Mystery"], isError: false, refetch: mocks.refetch}),
}));

function Location() {
    return <output aria-label="Location">{useLocation().search}</output>;
}

describe("library advanced filters", () => {
    it("preserves unrelated URL state, applies filters and sorting, and clears only advanced controls", async () => {
        render(<Provider forcedTheme="light"><MemoryRouter initialEntries={["/?q=space&sort=title&genre=Fantasy"]}>
            <LibraryAdvancedFilters/><Location/>
        </MemoryRouter></Provider>);

        fireEvent.click(screen.getByRole("button", {name: "Filter and sort books"}));
        await screen.findByRole("combobox", {name: "Filter by genre"});
        fireEvent.change(screen.getByRole("combobox", {name: "Filter by genre"}), {target: {value: "Mystery"}});
        fireEvent.change(screen.getByRole("spinbutton", {name: "Published from"}), {target: {value: "1980"}});
        fireEvent.change(screen.getByRole("textbox", {name: "Filter by series"}), {target: {value: "Earthsea"}});
        fireEvent.change(screen.getByRole("textbox", {name: "Filter by language"}), {target: {value: "English"}});
        fireEvent.change(screen.getByRole("textbox", {name: "Filter by publisher"}), {target: {value: "Ace"}});
        fireEvent.change(screen.getByRole("combobox", {name: "Sort books by"}), {target: {value: "author"}});
        fireEvent.change(screen.getByRole("combobox", {name: "Sort direction"}), {target: {value: "DESC"}});

        const params = new URLSearchParams(screen.getByLabelText("Location").textContent ?? "");
        expect(params.get("q")).toBe("space");
        expect(params.get("sort")).toBe("title");
        expect(params.get("genre")).toBe("Mystery");
        expect(params.get("yearFrom")).toBe("1980");
        expect(params.get("series")).toBe("Earthsea");
        expect(params.get("language")).toBe("English");
        expect(params.get("publisher")).toBe("Ace");
        expect(params.get("sortBy")).toBe("author");
        expect(params.get("sortDirection")).toBe("DESC");

        fireEvent.click(screen.getByRole("button", {name: "Clear filters"}));
        const clearedParams = new URLSearchParams(screen.getByLabelText("Location").textContent ?? "");
        expect(clearedParams.get("q")).toBe("space");
        expect(clearedParams.get("sort")).toBe("title");
        expect(clearedParams.has("genre")).toBe(false);
        expect(clearedParams.has("yearFrom")).toBe(false);
        expect(clearedParams.has("series")).toBe(false);
        expect(clearedParams.has("language")).toBe(false);
        expect(clearedParams.has("publisher")).toBe(false);
        expect(clearedParams.has("sortBy")).toBe(false);
        expect(clearedParams.has("sortDirection")).toBe(false);
    });
});
