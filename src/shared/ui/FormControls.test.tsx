import type {ReactNode} from "react";
import {fireEvent, render, screen, waitFor, within} from "@testing-library/react";
import {describe, expect, it, vi} from "vitest";
import {Provider} from "./provider";
import PasswordTextField from "./PasswordTextField";
import SubmitButton from "./SubmitButton";
import TextField from "./TextField";
import {DeleteConfirmationDialog} from "./modals/DeleteConfirmationDialog";

function renderUI(children: ReactNode) {
    return render(<Provider forcedTheme="light">{children}</Provider>);
}

describe("shared form controls", () => {
    it("keeps pending submissions disabled even when a caller passes disabled false", () => {
        renderUI(<SubmitButton pending disabled={false}>Save changes</SubmitButton>);
        expect(screen.getByRole("button", {name: "Save changes"})).toBeDisabled();
    });

    it("reveals a password only on request without changing its value or submitting", () => {
        const submit = vi.fn(event => event.preventDefault());
        renderUI(<form onSubmit={submit}>
            <PasswordTextField label="Password" defaultValue="synthetic-example" autoComplete="current-password"/>
        </form>);
        const input = screen.getByLabelText("Password");
        expect(input).toHaveAttribute("type", "password");
        fireEvent.click(screen.getByRole("button", {name: "Show password"}));
        expect(input).toHaveAttribute("type", "text");
        expect(input).toHaveValue("synthetic-example");
        fireEvent.click(screen.getByRole("button", {name: "Hide password"}));
        expect(input).toHaveAttribute("type", "password");
        expect(input).toHaveAttribute("autocomplete", "current-password");
        expect(submit).not.toHaveBeenCalled();
    });

    it("does not expose an enabled reveal action for a disabled secret field", () => {
        renderUI(<PasswordTextField label="Password" disabled/>);
        expect(screen.getByRole("button", {name: "Show password"})).toBeDisabled();
    });

    it("keeps help separate from field names and available to keyboard and screen readers", () => {
        renderUI(<>
            <TextField label="Email" tooltip="Use an address you can access."/>
            <PasswordTextField label="Password" tooltip="Leave blank to keep the saved password."/>
        </>);
        expect(screen.getByRole("textbox", {name: "Email"})).toHaveAccessibleDescription("Use an address you can access.");
        expect(screen.getByLabelText("Password", {selector: "input"})).toHaveAccessibleDescription("Leave blank to keep the saved password.");
        expect(screen.getByRole("img", {name: "Use an address you can access."})).toHaveAttribute("tabindex", "0");
    });
});

describe("legacy deletion confirmation", () => {
    it("names the subject and keeps the dialog open after a failure, then retries", async () => {
        const submit = vi.fn().mockRejectedValueOnce(new Error("Unavailable")).mockResolvedValueOnce(undefined);
        renderUI(<DeleteConfirmationDialog title="Delete Alex's account?" description="Their account will be removed."
            loading={false} onSubmit={submit}/>);
        fireEvent.click(screen.getByRole("button", {name: "Delete Alex's account?"}));
        const dialog = await screen.findByRole("alertdialog", {name: "Delete Alex's account?"});
        expect(dialog).toHaveAccessibleDescription("Their account will be removed.");
        fireEvent.click(within(dialog).getByRole("button", {name: "Delete"}));
        expect(await within(dialog).findByRole("alert")).toHaveTextContent("couldn't be deleted");
        fireEvent.click(within(dialog).getByRole("button", {name: "Delete"}));
        await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
        expect(submit).toHaveBeenCalledTimes(2);
    });

    it("treats a false result as failure instead of closing", async () => {
        renderUI(<DeleteConfirmationDialog title="Delete account?" loading={false} onSubmit={async () => false}/>);
        fireEvent.click(screen.getByRole("button", {name: "Delete account?"}));
        const dialog = await screen.findByRole("alertdialog");
        fireEvent.click(within(dialog).getByRole("button", {name: "Delete"}));
        expect(await within(dialog).findByRole("alert")).toBeVisible();
    });

    it("blocks duplicate mutation and dismissal while deletion is pending", async () => {
        let finish!: () => void;
        const submit = vi.fn(() => new Promise<void>(resolve => {finish = resolve;}));
        renderUI(<DeleteConfirmationDialog title="Delete account?" loading={false} onSubmit={submit}/>);
        fireEvent.click(screen.getByRole("button", {name: "Delete account?"}));
        const dialog = await screen.findByRole("alertdialog");
        const button = within(dialog).getByRole("button", {name: "Delete"});
        fireEvent.click(button);
        fireEvent.click(button);
        expect(button).toBeDisabled();
        expect(within(dialog).getByRole("button", {name: "Cancel"})).toBeDisabled();
        expect(within(dialog).getByRole("button", {name: "Close confirmation"})).toBeDisabled();
        expect(submit).toHaveBeenCalledOnce();
        finish();
        await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    });
});
