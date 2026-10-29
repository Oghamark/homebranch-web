import {useState, type ReactNode} from "react";
import {Button} from "@chakra-ui/react";
import {fireEvent, render, screen, waitFor, within} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";
import {BookJacket, ConfirmAction, EmptyState, ErrorState, LoadingState, PageHeader, PageSection} from "./EditorialUI";
import {Provider} from "./provider";
import TextField from "./TextField";
import {ClubLoading, ConfirmAction as ClubConfirmAction, clubPalette} from "@/pages/bookClub/ui/ClubUI";
import {editorialPalette} from "./theme";

function renderUI(children: ReactNode) {
    return render(<Provider forcedTheme="light">{children}</Provider>);
}

async function openConfirmation() {
    const trigger = screen.getByRole("button", {name: "Remove book"});
    trigger.focus();
    fireEvent.click(trigger);
    return screen.findByRole("alertdialog", {name: "Remove The Orchard?"});
}

const confirmation = {
    title: "Remove The Orchard?",
    description: "This removes the book from your library.",
    actionLabel: "Remove book",
};

afterEach(() => vi.restoreAllMocks());

describe("editorial presentation", () => {
    it("provides page and named section headings with actions", () => {
        renderUI(<>
            <PageHeader title="Your library" description="Choose your next read." actions={<Button>Add book</Button>}/>
            <PageSection id="favorites" title="Favorites" description="Books you love." actions={<Button>See all</Button>}>
                <p>Your saved books</p>
            </PageSection>
        </>);
        expect(screen.getByRole("heading", {level: 1, name: "Your library"})).toBeVisible();
        const section = screen.getByRole("region", {name: "Favorites"});
        expect(section).toHaveAttribute("id", "favorites");
        expect(within(section).getByRole("heading", {level: 2})).toHaveTextContent("Favorites");
        expect(within(section).getByRole("button", {name: "See all"})).toBeVisible();
        expect(screen.getByRole("button", {name: "Add book"})).toBeVisible();
    });

    it("distinguishes empty, loading and retryable error states", () => {
        const retry = vi.fn();
        renderUI(<>
            <EmptyState title="No favorites yet" action={<Button>Browse books</Button>}>Save a book you love.</EmptyState>
            <LoadingState label="Loading your books..."/>
            <ErrorState onRetry={retry}>Your books could not be loaded.</ErrorState>
        </>);
        expect(screen.getByRole("heading", {name: "No favorites yet"})).toBeVisible();
        expect(screen.getByRole("status")).toHaveTextContent("Loading your books...");
        expect(screen.getByRole("alert")).toHaveTextContent("Your books could not be loaded.");
        fireEvent.click(screen.getByRole("button", {name: "Try again"}));
        expect(retry).toHaveBeenCalledOnce();
    });

    it("keeps decorative jacket text out of accessible book names", () => {
        renderUI(<BookJacket title="The Orchard" author="A. Writer"/>);
        expect(screen.getByText("The Orchard").closest("[aria-hidden]")).toHaveAttribute("aria-hidden", "true");
    });

    it("displays actual cover art without duplicating the adjacent book name", () => {
        const {container} = renderUI(<BookJacket title="The Orchard" author="A. Writer" coverSrc="/orchard.jpg"/>);
        const image = container.querySelector("img");
        expect(image).toHaveAttribute("src", "/orchard.jpg");
        expect(image).toHaveAttribute("alt", "");
        expect(image?.closest("[aria-hidden]")).toHaveAttribute("aria-hidden", "true");
        expect(screen.queryByText("The Orchard")).not.toBeInTheDocument();
    });

    it("falls back on failed artwork and tries a changed cover source", () => {
        const {container, rerender} = renderUI(<BookJacket title="The Orchard" author="A. Writer" compact coverSrc="/missing.jpg"/>);
        fireEvent.error(container.querySelector("img")!);
        expect(container.querySelector("img")).toBeNull();
        expect(screen.getByText("The Orchard")).toBeVisible();
        rerender(<Provider forcedTheme="light"><BookJacket title="The Orchard" author="A. Writer" compact coverSrc="/new-cover.jpg"/></Provider>);
        expect(container.querySelector("img")).toHaveAttribute("src", "/new-cover.jpg");
        expect(screen.queryByText("The Orchard")).not.toBeInTheDocument();
    });

    it("preserves club exports and loading copy", () => {
        expect(ClubConfirmAction).toBe(ConfirmAction);
        expect(clubPalette).toBe(editorialPalette);
        renderUI(<ClubLoading/>);
        expect(screen.getByRole("status")).toHaveTextContent("Opening your reading space...");
    });

    it("associates existing field errors with the input and retains the draft", async () => {
        function Form() {
            const [value, setValue] = useState("");
            const [invalid, setInvalid] = useState(false);
            return <form onSubmit={event => {event.preventDefault(); setInvalid(true);}}>
                <TextField label="Shelf name" value={value} onChange={event => setValue(event.target.value)}
                    error={invalid} errorText="This name is already in use."/>
                <Button type="submit">Save shelf</Button>
            </form>;
        }
        renderUI(<Form/>);
        const field = screen.getByRole("textbox", {name: "Shelf name"});
        fireEvent.change(field, {target: {value: "Weekend reading"}});
        fireEvent.click(screen.getByRole("button", {name: "Save shelf"}));
        expect(field).toHaveValue("Weekend reading");
        expect(field).toHaveAttribute("aria-invalid", "true");
        await waitFor(() => expect(field).toHaveAccessibleDescription("This name is already in use."));
    });
});

describe("asynchronous confirmations", () => {
    it("focuses Cancel, names the consequence, cancels without mutation and returns focus", async () => {
        // JSDOM has no layout. The dialog focus trap checks rendered dimensions.
        vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(100);
        const action = vi.fn();
        renderUI(<ConfirmAction {...confirmation} onConfirm={action} destructive/>);
        const trigger = screen.getByRole("button", {name: "Remove book"});
        const dialog = await openConfirmation();
        expect(dialog).toHaveAccessibleDescription(confirmation.description);
        await waitFor(() => expect(within(dialog).getByRole("button", {name: "Cancel"})).toHaveFocus());
        const close = within(dialog).getByRole("button", {name: "Close confirmation"});
        expect(close).toBeVisible();
        close.focus();
        fireEvent.keyDown(close, {key: "Tab", code: "Tab"});
        await waitFor(() => expect(within(dialog).getByRole("button", {name: "Cancel"})).toHaveFocus());
        fireEvent.click(within(dialog).getByRole("button", {name: "Cancel"}));
        await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
        await waitFor(() => expect(trigger).toHaveFocus());
        expect(action).not.toHaveBeenCalled();
    });

    it("keeps rejection visible and allows a successful retry", async () => {
        const action = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(undefined);
        renderUI(<ConfirmAction {...confirmation} onConfirm={action}/>);
        const dialog = await openConfirmation();
        fireEvent.click(within(dialog).getByRole("button", {name: "Remove book"}));
        expect(await within(dialog).findByRole("alert")).toHaveTextContent("The change could not be saved. Please try again.");
        expect(dialog).toBeVisible();
        fireEvent.click(within(dialog).getByRole("button", {name: "Remove book"}));
        await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
        expect(action).toHaveBeenCalledTimes(2);
    });

    it("supports an explicit false failure result and clears it when reopened", async () => {
        const action = vi.fn().mockResolvedValue(false);
        renderUI(<ConfirmAction {...confirmation} onConfirm={action} errorText="The book is still in your library."/>);
        const dialog = await openConfirmation();
        fireEvent.click(within(dialog).getByRole("button", {name: "Remove book"}));
        expect(await within(dialog).findByRole("alert")).toHaveTextContent("The book is still in your library.");
        fireEvent.click(within(dialog).getByRole("button", {name: "Close confirmation"}));
        await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
        expect(within(await openConfirmation()).queryByRole("alert")).not.toBeInTheDocument();
    });

    it("blocks dismissal and duplicate submissions until the request completes", async () => {
        let resolve!: () => void;
        const action = vi.fn(() => new Promise<void>(done => {resolve = done;}));
        renderUI(<ConfirmAction {...confirmation} onConfirm={action}/>);
        const dialog = await openConfirmation();
        const submit = within(dialog).getByRole("button", {name: "Remove book"});
        fireEvent.click(submit);
        fireEvent.click(submit);
        expect(dialog).toHaveAttribute("aria-busy", "true");
        expect(submit).toBeDisabled();
        expect(within(dialog).getByRole("button", {name: "Cancel"})).toBeDisabled();
        const close = within(dialog).getByRole("button", {name: "Close confirmation"});
        expect(close).toBeDisabled();
        fireEvent.click(close);
        fireEvent.keyDown(dialog, {key: "Escape", code: "Escape"});
        expect(dialog).toBeVisible();
        expect(action).toHaveBeenCalledOnce();
        resolve();
        await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    });

    it("does not open a disabled confirmation", () => {
        renderUI(<ConfirmAction {...confirmation} onConfirm={vi.fn()} disabled/>);
        const trigger = screen.getByRole("button", {name: "Remove book"});
        expect(trigger).toBeDisabled();
        fireEvent.click(trigger);
        expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    });
});
