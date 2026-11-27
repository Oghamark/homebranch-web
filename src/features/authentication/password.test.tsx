import {fireEvent, render, screen, waitFor} from "@testing-library/react";
import {MemoryRouter, Route, Routes} from "react-router";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {Provider} from "@/shared/ui/provider";
import ForgotPassword from "@/app/routes/forgot-password";
import ResetPassword from "@/app/routes/reset-password";
import {ChangePassword} from "@/features/authentication/ui/ChangePassword";

const state = vi.hoisted(() => ({post: vi.fn(), dispatch: vi.fn()}));
vi.mock("@/features/authentication/api/axios", () => ({authenticationAxiosInstance: {post: state.post}}));
vi.mock("@/shared", () => ({config: {apiUrl: "/api"}}));
vi.mock("@/app/store", () => ({store: {dispatch: state.dispatch}}));
vi.mock("@/shared/api/rtk-query", () => ({
    authenticationApi: {util: {resetApiState: () => ({type: "reset-auth"})}},
    homebranchApi: {util: {resetApiState: () => ({type: "reset-api"})}},
}));

function mount(element: React.ReactNode) {
    return render(<Provider forcedTheme="light"><MemoryRouter>{element}</MemoryRouter></Provider>);
}

beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState(null, "", "/");
});

describe("password recovery", () => {
    it("submits an email and shows a non-enumerating confirmation", async () => {
        const request = vi.spyOn(globalThis, "fetch").mockResolvedValue({ok: true} as Response);
        mount(<ForgotPassword/>);
        fireEvent.change(screen.getByLabelText("Email"), {target: {value: "reader@example.test"}});
        fireEvent.click(screen.getByRole("button", {name: "Send reset link"}));
        expect(await screen.findByRole("status")).toHaveTextContent("If an eligible account exists");
        expect(request).toHaveBeenCalledWith("/api/password-recovery", expect.objectContaining({
            body: JSON.stringify({email: "reader@example.test"}),
        }));
        request.mockRestore();
    });

    describe("changing passwords", () => {
        it("refreshes an expired session, updates the password and returns to sign in", async () => {
            state.post.mockRejectedValueOnce({response: {status: 401}}).mockResolvedValue({});
            sessionStorage.setItem("user_id", "reader");
            mount(<Routes><Route path="/" element={<ChangePassword/>}/><Route path="/login" element={<p>Sign in again</p>}/></Routes>);
            fireEvent.change(screen.getByLabelText("Current password"), {target: {value: "old-password"}});
            fireEvent.change(screen.getByLabelText("New password"), {target: {value: "new-password"}});
            fireEvent.change(screen.getByLabelText("Confirm new password"), {target: {value: "new-password"}});
            fireEvent.click(screen.getByRole("button", {name: "Change password"}));
            expect(await screen.findByText("Sign in again")).toBeVisible();
            expect(state.post.mock.calls.map(call => call[0])).toEqual(["/password/change", "/refresh", "/password/change"]);
            expect(sessionStorage.getItem("user_id")).toBeNull();
            expect(state.dispatch).toHaveBeenCalledTimes(2);
        });

        it("reports an incorrect current password without logging the user out", async () => {
            state.post.mockRejectedValue({response: {status: 400}});
            sessionStorage.setItem("user_id", "reader");
            mount(<ChangePassword/>);
            fireEvent.change(screen.getByLabelText("Current password"), {target: {value: "wrong-password"}});
            fireEvent.change(screen.getByLabelText("New password"), {target: {value: "new-password"}});
            fireEvent.change(screen.getByLabelText("Confirm new password"), {target: {value: "new-password"}});
            fireEvent.click(screen.getByRole("button", {name: "Change password"}));
            expect(await screen.findByRole("alert")).toHaveTextContent("current password is incorrect");
            expect(sessionStorage.getItem("user_id")).toBe("reader");
        });
    });

    it("removes the token from the address and submits it only with matching passwords", async () => {
        window.history.replaceState(null, "", "/reset-password#token=secret");
        state.post.mockResolvedValue({});
        mount(<ResetPassword/>);
        expect(window.location.hash).toBe("");
        fireEvent.change(screen.getByLabelText("New password"), {target: {value: "new-password"}});
        fireEvent.change(screen.getByLabelText("Confirm new password"), {target: {value: "wrong-password"}});
        fireEvent.click(screen.getByRole("button", {name: "Reset password"}));
        expect(screen.getByRole("alert")).toHaveTextContent("passwords do not match");
        expect(state.post).not.toHaveBeenCalled();
        fireEvent.change(screen.getByLabelText("Confirm new password"), {target: {value: "new-password"}});
        fireEvent.click(screen.getByRole("button", {name: "Reset password"}));
        await waitFor(() => expect(state.post).toHaveBeenCalledWith("/password/reset", {token: "secret", newPassword: "new-password"}));
        expect(await screen.findByRole("status")).toHaveTextContent("password has been reset");
    });
});
