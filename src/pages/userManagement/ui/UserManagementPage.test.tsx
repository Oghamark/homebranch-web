import {fireEvent, render, screen, waitFor, within} from "@testing-library/react";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {Provider} from "@/shared/ui/provider";
import {UserActions, UserManagementPage} from "./UserManagementPage";

const mock = vi.hoisted(() => ({role: vi.fn(), remove: vi.fn(), refetch: vi.fn(), error: false}));
const user = {id: "other", name: "Other Reader", email: "other@example.test", role: "USER", provider: "LDAP"};
vi.mock("@/entities/user", () => ({
    CreateUserDialog: () => <button>Add user</button>,
    useGetUsersQuery: () => ({data: [user], isLoading: false, isError: mock.error, refetch: mock.refetch}),
    useDeleteUserMutation: () => [(email: string) => ({unwrap: () => mock.remove(email)}), {isLoading: false}],
    useUpdateUserRoleMutation: () => [(body: unknown) => ({unwrap: () => mock.role(body)}), {isLoading: false}],
}));
vi.mock("@/shared/ui/toaster", () => ({toaster: {success: vi.fn()}}));

beforeEach(() => {mock.role.mockReset(); mock.remove.mockReset(); mock.refetch.mockReset(); mock.error = false; sessionStorage.setItem("user_id", "self");});

describe("user administration safety", () => {
    it("does not offer self deletion or self role changes", () => {
        render(<Provider><UserActions user={{...user, id: "self"}}/></Provider>);
        expect(screen.getByText("Your account")).toBeVisible();
        expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });

    it("names the privileged role change and retains the confirmation on failure", async () => {
        mock.role.mockRejectedValueOnce({status: 403}).mockResolvedValueOnce({});
        render(<Provider><UserActions user={user}/></Provider>);
        fireEvent.click(screen.getByRole("button", {name: "Make administrator"}));
        const dialog = await screen.findByRole("alertdialog", {name: "Make administrator for Other Reader?"});
        expect(dialog).toHaveAccessibleDescription(/other@example.test.*manage users/);
        expect(mock.role).not.toHaveBeenCalled();
        fireEvent.click(within(dialog).getByRole("button", {name: "Make administrator"}));
        expect(await within(dialog).findByRole("alert")).toHaveTextContent("Check your permissions");
        fireEvent.click(within(dialog).getByRole("button", {name: "Make administrator"}));
        await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
        expect(mock.role).toHaveBeenLastCalledWith({id: "other", role: "ADMIN"});
    });

    it("keeps deletion failures open instead of showing success", async () => {
        mock.remove.mockRejectedValue({status: 500});
        render(<Provider><UserActions user={user}/></Provider>);
        fireEvent.click(screen.getByRole("button", {name: "Delete user"}));
        const dialog = await screen.findByRole("alertdialog", {name: "Delete Other Reader?"});
        expect(dialog).toHaveAccessibleDescription(/other@example.test/);
        fireEvent.click(within(dialog).getByRole("button", {name: "Delete user"}));
        expect(await within(dialog).findByRole("alert")).toHaveTextContent("could not be deleted");
        expect(mock.remove).toHaveBeenCalledWith("other@example.test");
    });

    it("distinguishes a permissions failure from no users and allows retry", () => {
        mock.error = true;
        render(<Provider><UserManagementPage/></Provider>);
        expect(screen.getByRole("alert")).toHaveTextContent("administrator access");
        expect(screen.queryByText("No users found")).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", {name: "Try again"}));
        expect(mock.refetch).toHaveBeenCalledOnce();
    });
});
