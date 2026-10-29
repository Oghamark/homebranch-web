import type {ComponentProps, ReactNode} from "react";
import {act, fireEvent, render, screen, waitFor} from "@testing-library/react";
import {createMemoryRouter, RouterProvider} from "react-router";
import {afterAll, beforeAll, beforeEach, describe, expect, it, vi} from "vitest";
import {transferableAbortController} from "node:util";
import {URLSearchParams as NodeSearchParams} from "node:url";
import {Provider} from "@/shared/ui/provider";
import Login, {clientAction as loginAction, clientLoader as loginLoader} from "@/app/routes/login";
import SignUp, {clientAction as signupAction, clientLoader as signupLoader} from "@/app/routes/sign-up";
import OidcCallback, {clientLoader as callbackLoader} from "@/app/routes/oidc-callback";
import {config} from "@/shared";
import {authenticationAxiosInstance, axiosErrorHandler} from "../api/axios";
import {getPublicAuthConfig} from "../api/publicConfig";
import ToastFactory from "@/shared/lib/toast/toast";

vi.mock("@/shared", () => ({config: {cloudMode: false, signupEnabled: true, portalUrl: "https://accounts.example.test", authenticationUrl: "https://auth.example.test"}}));
vi.mock("../api/axios", () => ({authenticationAxiosInstance: {post: vi.fn(), get: vi.fn()}, axiosErrorHandler: vi.fn()}));
vi.mock("../api/publicConfig", () => ({getPublicAuthConfig: vi.fn()}));
vi.mock("@/shared/lib/toast/toast", () => ({default: vi.fn()}));

const unconfigured: {oidcEnabled: boolean; oidcProviderName: string | null} = {oidcEnabled: false, oidcProviderName: null};
function loginPage(data = unconfigured) {
    return <Login {...{loaderData: data} as ComponentProps<typeof Login>}/>;
}
function signupPage(data = unconfigured) {
    return <SignUp {...{loaderData: data} as ComponentProps<typeof SignUp>}/>;
}
function mount(element: ReactNode, signup = false, path = signup ? "/sign-up" : "/login") {
    const router = createMemoryRouter([
        {path: "/login", element: signup ? <p>Sign in destination</p> : element, action: args => loginAction({...args, serverAction: async () => undefined})},
        {path: "/sign-up", element: signup ? element : <p>Registration destination</p>, action: args => signupAction({...args, serverAction: async () => undefined})},
        {path: "/", element: <p>Library destination</p>},
    ], {initialEntries: [path]});
    render(<Provider forcedTheme="light"><RouterProvider router={router}/></Provider>);
    return router;
}
function fillLogin() {
    fireEvent.change(screen.getByLabelText("Email"), {target: {value: "reader@example.test"}});
    fireEvent.change(screen.getByLabelText("Password"), {target: {value: "test-only-password"}});
}
// Keep React Router's request bodies and signals in Node's fetch realm.
beforeAll(() => {
    vi.stubGlobal("AbortController", class {
        constructor() {return transferableAbortController();}
    });
    vi.stubGlobal("URLSearchParams", NodeSearchParams);
});
afterAll(() => vi.unstubAllGlobals());
beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    config.cloudMode = false;
    config.signupEnabled = true;
    vi.mocked(getPublicAuthConfig).mockResolvedValue({signupEnabled: true, ...unconfigured});
});

describe("account access presentation", () => {
    it("provides branded accessible fields and configured provider without replacing password sign-in", () => {
        mount(loginPage({oidcEnabled: true, oidcProviderName: "Library SSO"}));
        expect(screen.getByRole("main")).toBeVisible();
        expect(screen.getByRole("heading", {name: "Welcome back", level: 1})).toBeVisible();
        expect(screen.getByRole("img", {name: "HomeBranch"})).toBeVisible();
        expect(screen.getByRole("button", {name: "Continue with Library SSO"})).toBeVisible();
        expect(screen.getByLabelText("Email")).toHaveAttribute("autocomplete", "username");
        const password = screen.getByLabelText("Password");
        expect(password).toHaveAttribute("autocomplete", "current-password");
        expect(password).toHaveAttribute("type", "password");
        const reveal = screen.getByRole("button", {name: "Show password"});
        expect(reveal).toHaveTextContent(/^$/);
        expect(reveal.querySelector("svg")).not.toBeNull();
        expect(reveal.parentElement).toBe(password.parentElement);
        fireEvent.click(reveal);
        expect(password).toHaveAttribute("type", "text");
        expect(screen.getByRole("button", {name: "Hide password"})).toHaveAttribute("aria-pressed", "true");
        expect(screen.getByRole("link", {name: "Create an account"})).toHaveAttribute("href", "/sign-up");
    });

    it("places independent eye icons inside both registration password fields without submitting", () => {
        mount(signupPage(), true);
        fillLogin();
        const password = screen.getByLabelText("Password");
        const confirmation = screen.getByLabelText("Confirm password");
        fireEvent.change(confirmation, {target: {value: "test-only-confirmation"}});
        const reveal = screen.getByRole("button", {name: "Show password"});
        const revealConfirmation = screen.getByRole("button", {name: "Show confirm password"});
        for (const [button, input] of [[reveal, password], [revealConfirmation, confirmation]]) {
            expect(button).toHaveTextContent(/^$/);
            expect(button.querySelector("svg")).not.toBeNull();
            expect(button.parentElement).toBe(input.parentElement);
            expect(button).toHaveAttribute("type", "button");
            expect(input).toHaveAttribute("autocomplete", "new-password");
        }
        fireEvent.click(reveal);
        expect(password).toHaveAttribute("type", "text");
        expect(confirmation).toHaveAttribute("type", "password");
        fireEvent.click(revealConfirmation);
        expect(confirmation).toHaveAttribute("type", "text");
        fireEvent.click(screen.getByRole("button", {name: "Hide password"}));
        expect(password).toHaveAttribute("type", "password");
        expect(password).toHaveValue("test-only-password");
        expect(confirmation).toHaveValue("test-only-confirmation");
        expect(authenticationAxiosInstance.post).not.toHaveBeenCalled();
    });

    it("keeps password access available when public provider configuration fails", async () => {
        vi.mocked(getPublicAuthConfig).mockRejectedValueOnce(new Error("offline"));
        expect(await loginLoader()).toEqual(unconfigured);
        mount(loginPage());
        expect(screen.queryByRole("button", {name: /Continue with/})).not.toBeInTheDocument();
        expect(screen.getByRole("button", {name: "Sign in"})).toBeVisible();
    });

    it("keeps Cloud account and subscription links distinct from local registration", () => {
        config.cloudMode = true;
        mount(loginPage());
        expect(screen.queryByRole("link", {name: "Create an account"})).not.toBeInTheDocument();
        expect(screen.getByRole("link", {name: "Create a Cloud account"})).toHaveAttribute("href", "https://accounts.example.test/cloud/signup");
        expect(screen.getByRole("link", {name: "Manage your account and subscription"})).toHaveAttribute("href", config.portalUrl);
    });

    it("explains disabled registration without inventing password recovery", () => {
        config.signupEnabled = false;
        mount(loginPage());
        expect(screen.getByText("Need an account? Contact the person who manages this library.")).toBeVisible();
        expect(screen.queryByRole("link", {name: /reset|create an account/i})).not.toBeInTheDocument();
    });

    it("retains account-blocked feedback after clearing only the error parameter", async () => {
        const message = "Your account is suspended or has no active subscription.";
        const router = mount(loginPage(), false, `/login?error=${encodeURIComponent(message)}&context=account`);
        expect(await screen.findByRole("alert")).toHaveTextContent(message);
        await waitFor(() => expect(router.state.location.search).toBe("?context=account"));
        expect(screen.getByRole("alert")).toHaveTextContent(message);
        expect(ToastFactory).toHaveBeenCalledWith({message, type: "error"});
    });

    it("shows durable associated validation and keeps signup drafts without sending mismatched passwords", async () => {
        mount(signupPage(), true);
        fireEvent.change(screen.getByLabelText("Name"), {target: {value: "Reader"}});
        fillLogin();
        fireEvent.change(screen.getByLabelText("Confirm password"), {target: {value: "different-test-value"}});
        fireEvent.click(screen.getByRole("button", {name: "Create account"}));
        const confirmation = screen.getByLabelText("Confirm password");
        expect(confirmation).toHaveAttribute("aria-invalid", "true");
        await waitFor(() => expect(confirmation).toHaveAccessibleDescription("The passwords do not match."));
        expect(confirmation).toHaveFocus();
        expect(screen.getByLabelText("Name")).toHaveValue("Reader");
        expect(confirmation).toHaveAttribute("autocomplete", "new-password");
        expect(authenticationAxiosInstance.post).not.toHaveBeenCalled();
    });

    it("validates keyboard form submission before a request", () => {
        mount(loginPage());
        fireEvent.submit(screen.getByRole("button", {name: "Sign in"}).closest("form")!);
        expect(screen.getByLabelText("Email")).toHaveFocus();
        expect(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true");
        expect(screen.getByText("Enter your password.")).toBeVisible();
        expect(authenticationAxiosInstance.post).not.toHaveBeenCalled();
    });

    it("keeps server failures inline, preserves drafts and notifications, and allows retry", async () => {
        const failure = {response: {data: {message: ["Your account is not active."]}}};
        vi.mocked(authenticationAxiosInstance.post).mockRejectedValueOnce(failure)
            .mockResolvedValueOnce({data: {success: false}});
        mount(loginPage());
        fillLogin();
        fireEvent.click(screen.getByRole("button", {name: "Sign in"}));
        expect(await screen.findByRole("alert")).toHaveTextContent("Your account is not active.");
        expect(screen.getByLabelText("Email")).toHaveValue("reader@example.test");
        expect(screen.getByLabelText("Password")).toHaveValue("test-only-password");
        expect(axiosErrorHandler).toHaveBeenCalledWith(failure);
        fireEvent.click(screen.getByRole("button", {name: "Sign in"}));
        await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("We couldn't sign you in. Check your details and try again."));
        expect(sessionStorage.length).toBe(0);
    });

    it("blocks duplicate form submissions while pending then preserves the existing safe session redirect", async () => {
        let resolve!: (value: unknown) => void;
        vi.mocked(authenticationAxiosInstance.post).mockImplementationOnce(() => new Promise(done => {resolve = done;}));
        const router = mount(loginPage(), false, "/login?returnTo=https://untrusted.example.test");
        fillLogin();
        const button = screen.getByRole("button", {name: "Sign in"});
        const form = button.closest("form")!;
        fireEvent.submit(form);
        fireEvent.submit(form);
        await waitFor(() => expect(authenticationAxiosInstance.post).toHaveBeenCalledOnce());
        expect(button).toBeDisabled();
        expect(form).toHaveAttribute("aria-busy", "true");
        expect(screen.getByRole("status")).toHaveTextContent("Signing you in...");
        await act(async () => resolve({data: {success: true, value: {userId: "reader-id", accessToken: `test.${btoa(JSON.stringify({role: "USER"}))}.test`}}}));
        expect(await screen.findByText("Library destination")).toBeVisible();
        expect(router.state.location.pathname).toBe("/");
        expect(sessionStorage.getItem("user_id")).toBe("reader-id");
        expect(sessionStorage.getItem("user_role")).toBe("USER");
        expect(sessionStorage.length).toBe(2);
    });
});

describe("registration and callback contracts", () => {
    const args = (url: string) => ({request: new Request(url)}) as Parameters<typeof callbackLoader>[0];
    it("guards both registration loader and action when signup is disabled or in Cloud", async () => {
        config.signupEnabled = false;
        expect((await signupLoader() as Response).headers.get("Location")).toBe("/login");
        expect((await signupAction({request: new Request("https://library.example.test/sign-up", {method: "POST"})} as Parameters<typeof signupAction>[0]) as Response).headers.get("Location")).toBe("/login");
        config.signupEnabled = true;
        config.cloudMode = true;
        expect((await signupLoader() as Response).headers.get("Location")).toBe("/login");
        expect((await signupAction({request: new Request("https://library.example.test/sign-up", {method: "POST"})} as Parameters<typeof signupAction>[0]) as Response).headers.get("Location")).toBe("/login");
        expect(authenticationAxiosInstance.post).not.toHaveBeenCalled();
    });

    it("validates action submissions even when browser validation is bypassed", async () => {
        const request = (fields: Record<string, string>) => new Request("https://library.example.test/sign-up", {method: "POST", body: new URLSearchParams(fields)});
        const signupResult = await signupAction({request: request({name: "Reader", email: "reader@example.test", password: "test-only-password", password_confirmation: "different-test-value"})} as Parameters<typeof signupAction>[0]);
        expect(signupResult).toEqual({fieldErrors: {password_confirmation: "The passwords do not match."}});
        const loginResult = await loginAction({request: request({email: "not-an-email"})} as Parameters<typeof loginAction>[0]);
        expect(loginResult).toEqual({fieldErrors: {email: "Enter a valid email address.", password: "Enter your password."}});
        expect(authenticationAxiosInstance.post).not.toHaveBeenCalled();
        expect(sessionStorage.length).toBe(0);
    });

    it("loads the signup provider and preserves password registration during config outages", async () => {
        vi.mocked(getPublicAuthConfig).mockResolvedValueOnce({signupEnabled: true, oidcEnabled: true, oidcProviderName: "Library SSO"});
        expect(await signupLoader()).toMatchObject({oidcEnabled: true, oidcProviderName: "Library SSO"});
        vi.mocked(getPublicAuthConfig).mockRejectedValueOnce(new Error("offline"));
        expect(await signupLoader()).toEqual(unconfigured);
    });

    it("retains registration failure feedback and existing successful session role handling", async () => {
        vi.mocked(authenticationAxiosInstance.post).mockRejectedValueOnce(new Error("offline"))
            .mockResolvedValueOnce({data: {success: true, value: {userId: "new-reader", accessToken: `test.${btoa(JSON.stringify({roles: ["ADMIN"]}))}.test`}}});
        mount(signupPage(), true);
        fireEvent.change(screen.getByLabelText("Name"), {target: {value: "Reader"}});
        fillLogin();
        fireEvent.change(screen.getByLabelText("Confirm password"), {target: {value: "test-only-password"}});
        fireEvent.click(screen.getByRole("button", {name: "Create account"}));
        expect(await screen.findByRole("alert")).toHaveTextContent("We couldn't create your account. Please try again.");
        expect(screen.getByLabelText("Name")).toHaveValue("Reader");
        fireEvent.click(screen.getByRole("button", {name: "Create account"}));
        expect(await screen.findByText("Library destination")).toBeVisible();
        expect(sessionStorage.getItem("user_role")).toBe("ADMIN");
    });

    it("routes OIDC errors back to durable login feedback without attempting session lookup", async () => {
        const result = await callbackLoader(args("https://library.example.test/oidc-callback?error=Access%20denied"));
        expect(result.headers.get("Location")).toBe("/login?error=Access%20denied");
        expect(authenticationAxiosInstance.get).not.toHaveBeenCalled();
        expect(sessionStorage.length).toBe(0);
    });

    it("retains OIDC identity and a fixed local destination regardless of query redirect values", async () => {
        vi.mocked(authenticationAxiosInstance.get).mockResolvedValueOnce({data: {value: {id: "sso-reader", role: "ADMIN"}}});
        const result = await callbackLoader(args("https://library.example.test/oidc-callback?returnTo=https://untrusted.example.test"));
        expect(authenticationAxiosInstance.get).toHaveBeenCalledWith("/me");
        expect(result.headers.get("Location")).toBe("/");
        expect(sessionStorage.getItem("user_id")).toBe("sso-reader");
        expect(sessionStorage.getItem("user_role")).toBe("ADMIN");
    });

    it("redirects callback lookup failure safely and presents accessible pending state", async () => {
        vi.mocked(authenticationAxiosInstance.get).mockRejectedValueOnce(new Error("offline"));
        const result = await callbackLoader(args("https://library.example.test/oidc-callback"));
        expect(result.headers.get("Location")).toBe("/login?error=Authentication%20failed");
        render(<Provider forcedTheme="light"><OidcCallback/></Provider>);
        expect(screen.getByRole("heading", {name: "Returning to your library"})).toBeVisible();
        expect(screen.getByRole("status")).toHaveTextContent("Completing sign in...");
    });
});
