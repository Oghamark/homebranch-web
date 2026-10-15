import {fireEvent, render, screen} from "@testing-library/react";
import {describe, expect, it} from "vitest";
import {Link, MemoryRouter, useLocation, useNavigate} from "react-router";
import {useCollectionSearch, useLibrarySearch} from "./useLibrarySearch";

function SearchHarness() {
    const {query, setQuery} = useCollectionSearch();
    const search = useLibrarySearch();
    const location = useLocation();
    const navigate = useNavigate();
    return <>
        <input aria-label="Search" value={query} onChange={event => setQuery(event.target.value)}/>
        <button onClick={() => setQuery("")}>Clear</button>
        <button onClick={() => navigate(-1)}>Back</button>
        <output aria-label="API query">{search}</output>
        <output aria-label="URL">{location.search}</output>
        <Link to="/favorites">Favorites</Link>
        <Link to="/?q=author%3ALe%20Guin&sort=title">Library</Link>
    </>;
}

describe("collection search", () => {
    it("preserves keyword syntax, unrelated URL parameters, and clear behavior", () => {
        render(<MemoryRouter initialEntries={["/?q=isbn%3A9780&sort=title"]}><SearchHarness/></MemoryRouter>);
        expect(screen.getByLabelText("API query")).toHaveTextContent("isbn:9780");
        fireEvent.change(screen.getByRole("textbox"), {target: {value: 'author:"Le Guin"'}});
        expect(screen.getByLabelText("API query")).toHaveTextContent('author:"Le Guin"');
        expect(screen.getByLabelText("URL")).toHaveTextContent("sort=title");
        fireEvent.click(screen.getByText("Clear"));
        expect(screen.getByLabelText("URL")).toHaveTextContent("?sort=title");
    });

    it("does not carry searches across destinations and restores linked query state", () => {
        render(<MemoryRouter initialEntries={["/?q=isbn%3A9780"]}><SearchHarness/></MemoryRouter>);
        fireEvent.click(screen.getByText("Favorites"));
        expect(screen.getByRole("textbox")).toHaveValue("");
        expect(screen.getByLabelText("API query")).toBeEmptyDOMElement();
        fireEvent.click(screen.getByText("Back"));
        expect(screen.getByRole("textbox")).toHaveValue("isbn:9780");
        fireEvent.click(screen.getByText("Library"));
        expect(screen.getByRole("textbox")).toHaveValue("author:Le Guin");
    });
});
