import {act, fireEvent, render, screen, waitFor} from "@testing-library/react";
import {createMemoryRouter, RouterProvider} from "react-router";
import {beforeAll, afterAll, beforeEach, describe, expect, it, vi} from "vitest";
import {transferableAbortController} from "node:util";
import {URLSearchParams as NodeSearchParams} from "node:url";
import {Provider} from "@/shared/ui/provider";
import Settings from "@/app/routes/dashboard/settings";
import {config} from "@/shared";
import {integrationPatch} from "./SignInSettings";

const state = vi.hoisted(() => ({
    mail: {configured: true, smtp: {host: "smtp.example.test", port: 587, secure: false, user: "reader", from: "library@example.test", hasPassword: true}},
    kindle: {kindleEmail: "reader@kindle.test"},
    auth: {
        signupEnabled: true, oidcEnabled: false, oidcProviderName: "Library SSO", oidcIssuerUrl: "", oidcClientId: "",
        oidcCallbackUrl: "", oidcClientSecret: null, ldapEnabled: false, ldapServerUrl: "", ldapBaseDn: "", ldapBindDn: "",
        ldapBindPassword: null, ldapAdminGroup: "", ldapUserGroup: "", ldapEmailField: "", ldapNameField: "",
    },
    updateMail: vi.fn(), updateKindle: vi.fn(), updateAuth: vi.fn(), testMail: vi.fn(), refetch: vi.fn(),
    authQuery: vi.fn(),
    version: 0, listeners: new Set<() => void>(),
}));
vi.mock("@/shared", () => ({config: {cloudMode: false}}));
vi.mock("@/entities/user", () => ({
    useGetUserByIdQuery: () => ({data: {name: "Reader", email: "reader@example.test"}, refetch: state.refetch}),
}));
vi.mock("@/entities/authConfig", async () => {
    const {useSyncExternalStore} = await import("react");
    return {
    useGetAuthConfigQuery: () => {
        useSyncExternalStore(listener => {state.listeners.add(listener); return () => {state.listeners.delete(listener);};}, () => state.version);
        state.authQuery(); return {data: state.auth, refetch: state.refetch};
    },
    useUpdateAuthConfigMutation: () => [state.updateAuth, {isLoading: false}],
};});
vi.mock("@/entities/kindle/api/api", async () => {
    const {useSyncExternalStore} = await import("react");
    function useRefresh() {
        useSyncExternalStore(listener => {state.listeners.add(listener); return () => {state.listeners.delete(listener);};}, () => state.version);
    }
    return {
    useGetKindleEmailQuery: () => {useRefresh(); return {data: state.kindle, refetch: state.refetch};},
    useGetMailSenderQuery: () => ({data: {configured: true, sender: "library@example.test"}, refetch: state.refetch}),
    useGetMailConfigQuery: () => {useRefresh(); return {data: state.mail, refetch: state.refetch};},
    useUpdateKindleEmailMutation: () => [state.updateKindle, {isLoading: false}],
    useUpdateMailConfigMutation: () => [state.updateMail, {isLoading: false}],
    useSendTestMailMutation: () => [state.testMail, {isLoading: false}],
    getApiErrorMessage: () => "Could not save settings. Try again.",
};});

function mount(section = "profile") {
    const router = createMemoryRouter([
        {path: "/settings", element: <Settings/>}, {path: "/library", element: <p>Library</p>},
    ], {initialEntries: [`/settings?section=${section}`]});
    const element = <Provider forcedTheme="light"><RouterProvider router={router}/></Provider>;
    render(element);
    return {router, refresh: () => act(() => {state.version++; state.listeners.forEach(listener => listener());})};
}

beforeAll(() => {
    vi.stubGlobal("AbortController", class {constructor() {return transferableAbortController();}});
    vi.stubGlobal("URLSearchParams", NodeSearchParams);
});
afterAll(() => vi.unstubAllGlobals());
beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    sessionStorage.setItem("user_id", "reader-id");
    sessionStorage.setItem("user_role", "ADMIN");
    config.cloudMode = false;
    state.mail = {configured: true, smtp: {host: "smtp.example.test", port: 587, secure: false, user: "reader", from: "library@example.test", hasPassword: true}};
    state.kindle = {kindleEmail: "reader@kindle.test"};
    state.updateMail.mockReturnValue({unwrap: () => Promise.resolve(state.mail)});
    state.updateKindle.mockReturnValue({unwrap: () => Promise.resolve(state.kindle)});
    state.updateAuth.mockReturnValue({unwrap: () => Promise.resolve(state.auth)});
    state.testMail.mockReturnValue({unwrap: () => Promise.resolve({success: true})});
});

describe("settings sections and safety", () => {
    it("defaults to read-only profile, with real section links", () => {
        mount();
        expect(screen.getByRole("heading", {name: "Profile"})).toBeVisible();
        expect(screen.getByText("Your account information is read-only here.")).toBeVisible();
        expect(screen.getByRole("link", {name: "Send to Kindle"})).toHaveAttribute("href", "/settings?section=kindle");
        expect(screen.getByRole("link", {name: "Profile"})).toHaveAttribute("aria-current", "page");
        expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    });

    it("hides all administrator sections and does not fetch auth configuration for ordinary users", () => {
        sessionStorage.setItem("user_role", "USER");
        mount("sign-in");
        expect(screen.getByRole("heading", {name: "Profile"})).toBeVisible();
        expect(screen.queryByRole("link", {name: "Email delivery"})).not.toBeInTheDocument();
        expect(screen.queryByRole("link", {name: "Registration"})).not.toBeInTheDocument();
        expect(state.authQuery).not.toHaveBeenCalled();
    });

    it("keeps Cloud email and sign-in integrations but excludes registration", () => {
        config.cloudMode = true;
        mount("registration");
        expect(screen.getByRole("link", {name: "Email delivery"})).toBeVisible();
        expect(screen.getByRole("link", {name: "Sign-in integrations"})).toBeVisible();
        expect(screen.queryByRole("link", {name: "Registration"})).not.toBeInTheDocument();
        expect(screen.getByRole("heading", {name: "Profile"})).toBeVisible();
    });

    it("retains SMTP drafts on refetch, preserves a blank saved password, and clears dirty state after saving", async () => {
        const {refresh} = mount("email");
        const host = screen.getByLabelText("SMTP host");
        fireEvent.change(host, {target: {value: "edited.example.test"}});
        state.mail = {...state.mail, smtp: {...state.mail.smtp, host: "refetched.example.test"}};
        refresh();
        expect(screen.getByLabelText("SMTP host")).toHaveValue("edited.example.test");
        expect(screen.getByLabelText("Password")).toHaveValue("");
        fireEvent.click(screen.getByRole("button", {name: "Save email settings"}));
        await waitFor(() => expect(state.updateMail).toHaveBeenCalledWith(expect.objectContaining({host: "edited.example.test", password: undefined})));
        expect(await screen.findByText("Email settings saved.")).toBeVisible();
        expect(screen.getByRole("button", {name: "Save email settings"})).toBeDisabled();
    });

    it("retains failed mutations and asks before section changes or browser unload", async () => {
        state.updateKindle.mockReturnValue({unwrap: () => Promise.reject(new Error("offline"))});
        const {router} = mount("kindle");
        fireEvent.change(screen.getByLabelText("Kindle email address"), {target: {value: "new@kindle.test"}});
        fireEvent.click(screen.getByRole("button", {name: "Save Kindle email"}));
        expect(await screen.findByRole("alert")).toHaveTextContent("Could not save");
        expect(screen.getByLabelText("Kindle email address")).toHaveValue("new@kindle.test");
        const event = new Event("beforeunload", {cancelable: true});
        window.dispatchEvent(event);
        expect(event.defaultPrevented).toBe(true);
        fireEvent.click(screen.getByRole("link", {name: "Appearance"}));
        expect(await screen.findByRole("alertdialog")).toHaveTextContent("Discard unsaved settings?");
        fireEvent.click(screen.getByRole("button", {name: "Keep editing"}));
        await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
        expect(router.state.location.search).toBe("?section=kindle");
        fireEvent.click(screen.getByRole("link", {name: "Appearance"}));
        fireEvent.click(await screen.findByRole("button", {name: "Discard changes"}));
        await waitFor(() => expect(router.state.location.search).toBe("?section=appearance"));
        expect(await screen.findByRole("heading", {name: "Appearance"})).toBeVisible();
    });

    it("keeps Kindle drafts through refetch and supports clearing the address", async () => {
        const {refresh} = mount("kindle");
        fireEvent.change(screen.getByLabelText("Kindle email address"), {target: {value: ""}});
        state.kindle = {kindleEmail: "refetched@kindle.test"};
        refresh();
        expect(screen.getByLabelText("Kindle email address")).toHaveValue("");
        fireEvent.click(screen.getByRole("button", {name: "Save Kindle email"}));
        await waitFor(() => expect(state.updateKindle).toHaveBeenCalledWith(null));
        expect(await screen.findByText("Kindle email saved.")).toBeVisible();
    });

    it("saves OIDC without replacing a blank secret and retains integration edits on refetch", async () => {
        const {refresh} = mount("sign-in");
        fireEvent.change(screen.getByLabelText("Provider name"), {target: {value: "Updated SSO"}});
        state.auth = {...state.auth, oidcProviderName: "Refetched SSO"};
        refresh();
        expect(screen.getByLabelText("Provider name")).toHaveValue("Updated SSO");
        fireEvent.click(screen.getByRole("button", {name: "Save OIDC settings"}));
        await waitFor(() => expect(state.updateAuth).toHaveBeenCalledWith(expect.objectContaining({oidcProviderName: "Updated SSO"})));
        expect(state.updateAuth.mock.calls[0][0]).not.toHaveProperty("oidcClientSecret");
        expect(await screen.findByText("OIDC settings saved.")).toBeVisible();
    });

    it("uses the saved SMTP configuration for test email and provides inline success", async () => {
        mount("email");
        fireEvent.change(screen.getByLabelText("Send test email to"), {target: {value: "recipient@example.test"}});
        fireEvent.click(screen.getByRole("button", {name: "Send test"}));
        await waitFor(() => expect(state.testMail).toHaveBeenCalledWith("recipient@example.test"));
        expect(await screen.findByText("Test email sent.")).toBeVisible();
        fireEvent.change(screen.getByLabelText("SMTP host"), {target: {value: "changed.test"}});
        expect(screen.getByRole("button", {name: "Send test"})).toBeDisabled();
    });

    it("retains entered SMTP credentials on failure and clears only the credential draft after success", async () => {
        state.updateMail.mockReturnValueOnce({unwrap: () => Promise.reject(new Error("offline"))});
        mount("email");
        fireEvent.change(screen.getByLabelText("Password"), {target: {value: "synthetic-replacement"}});
        fireEvent.click(screen.getByRole("button", {name: "Save email settings"}));
        expect(await screen.findByRole("alert")).toHaveTextContent("Could not save");
        expect(screen.getByLabelText("Password")).toHaveValue("synthetic-replacement");
        fireEvent.click(screen.getByRole("button", {name: "Save email settings"}));
        expect(await screen.findByText("Email settings saved.")).toBeVisible();
        expect(screen.getByLabelText("Password")).toHaveValue("");
        expect(state.updateMail).toHaveBeenLastCalledWith(expect.objectContaining({password: "synthetic-replacement"}));
    });

    it("uses the existing application appearance preference", () => {
        mount("appearance");
        expect(screen.getByRole("button", {name: "Light"})).toHaveAttribute("aria-pressed", "true");
        expect(screen.getByRole("button", {name: "Dark"})).toHaveAttribute("aria-pressed", "false");
        expect(screen.getByText("Choose the application's appearance. Your reading theme stays separate.")).toBeVisible();
    });

    it("guards leaving settings with a substantial unsaved form", async () => {
        const {router} = mount("email");
        fireEvent.change(screen.getByLabelText("SMTP host"), {target: {value: "edited.test"}});
        await act(async () => {void router.navigate("/library");});
        expect(await screen.findByRole("alertdialog")).toBeVisible();
        fireEvent.click(screen.getByRole("button", {name: "Discard changes"}));
        expect(await screen.findByText("Library")).toBeVisible();
    });

    it("saves registration immediately and keeps errors visible", async () => {
        state.updateAuth.mockReturnValue({unwrap: () => Promise.reject({data: "Registration could not be saved."})});
        mount("registration");
        fireEvent.click(screen.getByRole("checkbox", {name: "Allow sign up"}));
        await waitFor(() => expect(state.updateAuth).toHaveBeenCalledWith({signupEnabled: false}));
        expect(await screen.findByRole("alert")).toHaveTextContent("Registration could not be saved.");
    });

    it("omits blank LDAP credentials while allowing explicit secret replacement", () => {
        expect(integrationPatch("ldap", {ldapEnabled: true, ldapBindPassword: ""})).not.toHaveProperty("ldapBindPassword");
        expect(integrationPatch("oidc", {oidcEnabled: true, oidcClientSecret: "synthetic-value"})).toHaveProperty("oidcClientSecret", "synthetic-value");
    });
});
