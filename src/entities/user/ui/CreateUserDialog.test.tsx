import {fireEvent, render, screen, waitFor, within} from "@testing-library/react";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {Provider} from "@/shared/ui/provider";
import {CreateUserDialog} from "./CreateUserDialog";

const state = vi.hoisted(() => ({submit: vi.fn(), loading: false}));
vi.mock("@/entities/user/api/api", () => ({
    useCreateUserMutation: () => [(body: unknown) => ({unwrap: () => state.submit(body)}), {isLoading: state.loading}],
}));
vi.mock("@/shared/ui/toaster", () => ({toaster: {success: vi.fn()}}));

async function open() {
    render(<Provider forcedTheme="light"><CreateUserDialog/></Provider>);
    fireEvent.click(screen.getByRole("button", {name: "Add user"}));
    return screen.findByRole("dialog", {name: "Create user"});
}

function fill(dialog: HTMLElement, confirmation = "A valid passphrase") {
    fireEvent.change(within(dialog).getByLabelText("Name"), {target: {value: "New Reader"}});
    fireEvent.change(within(dialog).getByLabelText("Email"), {target: {value: "reader@example.test"}});
    fireEvent.change(within(dialog).getByLabelText("Password", {exact: true}), {target: {value: "A valid passphrase"}});
    fireEvent.change(within(dialog).getByLabelText("Confirm password", {exact: true}), {target: {value: confirmation}});
}

beforeEach(() => {state.submit.mockReset(); state.loading = false;});

describe("user creation", () => {
    it("associates mismatch feedback and does not send an invalid confirmation", async () => {
        const dialog = await open();
        fill(dialog, "different");
        fireEvent.click(within(dialog).getByRole("button", {name: "Create user"}));
        expect(state.submit).not.toHaveBeenCalled();
        expect(within(dialog).getByLabelText("Confirm password", {exact: true})).toHaveAttribute("aria-invalid", "true");
        expect(await within(dialog).findByText("Passwords do not match.")).toBeVisible();
    });

    it("keeps the form and password on API failure and allows a retry", async () => {
        state.submit.mockRejectedValueOnce({status: 403}).mockResolvedValueOnce({});
        const dialog = await open();
        fill(dialog);
        fireEvent.click(within(dialog).getByRole("button", {name: "Create user"}));
        expect(await within(dialog).findByRole("alert")).toHaveTextContent("could not be created");
        expect(within(dialog).getByLabelText("Name")).toHaveValue("New Reader");
        expect(within(dialog).getByLabelText("Password", {exact: true})).toHaveValue("A valid passphrase");
        fireEvent.click(within(dialog).getByRole("button", {name: "Create user"}));
        await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
        expect(state.submit).toHaveBeenCalledTimes(2);
    });

    it("requires intentional discard when closing a dirty draft", async () => {
        const dialog = await open();
        fill(dialog);
        fireEvent.click(within(dialog).getByRole("button", {name: "Cancel"}));
        expect(within(dialog).getByText("Discard this new account draft?")).toBeVisible();
        fireEvent.click(within(dialog).getByRole("button", {name: "Keep editing"}));
        expect(within(dialog).getByLabelText("Name")).toHaveValue("New Reader");
        fireEvent.click(within(dialog).getByRole("button", {name: "Close create user"}));
        fireEvent.click(await within(dialog).findByRole("button", {name: "Discard draft"}));
        await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
        expect(state.submit).not.toHaveBeenCalled();
    });

    it("blocks duplicate submission and closing while a request is pending", async () => {
        let done!: () => void;
        state.submit.mockImplementation(() => new Promise<void>(resolve => {done = resolve;}));
        const dialog = await open();
        fill(dialog);
        const submit = within(dialog).getByRole("button", {name: "Create user"});
        fireEvent.click(submit); fireEvent.click(submit);
        fireEvent.click(within(dialog).getByRole("button", {name: "Cancel"}));
        expect(state.submit).toHaveBeenCalledOnce();
        expect(dialog).toBeVisible();
        done();
        await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    });
});
