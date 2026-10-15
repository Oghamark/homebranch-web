import {fireEvent, render, screen, waitFor, within} from "@testing-library/react";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {Provider} from "@/shared/ui/provider";
import LibraryManagement, {clientLoader} from "./library-management";

const mock = vi.hoisted(() => ({
    assign: vi.fn(), resolve: vi.fn(), scan: vi.fn(), save: vi.fn(), retry: vi.fn(), orphaned: vi.fn(),
    booksError: false, jobsError: false, settingError: false, usersError: false, cloud: false,
}));
const owner = {id: "owner", name: "Destination Reader", email: "owner@example.test", provider: "local"};
const book = (id: string) => ({id, title: `Book ${id}`, author: "A. Writer", fileName: `${id}.epub`});
function bookResult(params: {offset?: number; query?: string}) {
    const data = {data: [book(params.query ? "search" : params.offset ? "next" : "first")], total: 25};
    return {data, currentData: data, isLoading: false, isError: mock.booksError, refetch: mock.retry};
}
vi.mock("@/entities/job", () => ({
    useGetJobsQuery: () => ({data: {data: [], total: 0}, currentData: {data: [], total: 0},
        isLoading: false, isError: mock.jobsError, refetch: mock.retry}),
    useTriggerLibraryScanMutation: () => [() => ({unwrap: () => mock.scan()}), {isLoading: false}],
    useGetLibrarySettingQuery: () => ({data: {value: "owner"}, isLoading: false, isError: mock.settingError, refetch: mock.retry}),
    useUpsertLibrarySettingMutation: () => [(body: unknown) => ({unwrap: () => mock.save(body)}), {isLoading: false}],
    useBulkAssignBookOwnerMutation: () => [(body: unknown) => ({unwrap: () => mock.assign(body)}), {isLoading: false}],
    useGetUnownedBooksQuery: (params: {offset: number}) => bookResult(params),
    useGetAdminBooksQuery: (params: {offset: number; query?: string}) => bookResult(params),
    useGetOrphanedBooksMutation: () => [mock.orphaned, {data: undefined, isLoading: false, isError: false}],
}));
vi.mock("@/entities/user", () => ({
    useGetUsersQuery: () => ({data: [owner], isSuccess: !mock.usersError, isLoading: false, isError: mock.usersError, refetch: mock.retry}),
}));
vi.mock("@/entities/book", () => ({
    useListDuplicatesQuery: () => {
        const data = {data: [{duplicate: {id: "pair"}, suspectBook: book("upload"), originalBook: book("original")}], total: 1};
        return {data, currentData: data, isLoading: false, isError: false};
    },
    useResolveDuplicateMutation: () => [(body: unknown) => ({unwrap: () => mock.resolve(body)}), {isLoading: false}],
    useTriggerDuplicateScanMutation: () => [() => ({unwrap: () => mock.scan()}), {isLoading: false}],
}));
vi.mock("@/shared", () => ({config: {get cloudMode() {return mock.cloud;}}, useJobStream: vi.fn()}));
vi.mock("@/shared/lib/toast/toast", () => ({default: vi.fn()}));

beforeEach(() => {
    vi.resetAllMocks();
    mock.booksError = false; mock.jobsError = false; mock.settingError = false; mock.usersError = false; mock.cloud = false;
    mock.assign.mockResolvedValue({assigned: 1, failed: 0});
    mock.resolve.mockResolvedValue(undefined); mock.save.mockResolvedValue(undefined);
    sessionStorage.setItem("user_role", "ADMIN");
});

function page() {
    render(<Provider forcedTheme="light"><LibraryManagement/></Provider>);
    return screen.getByRole("region", {name: "Book ownership"});
}

async function select(ownership: HTMLElement, title = "Book first") {
    const checkbox = within(ownership).getByRole("checkbox", {name: `Select ${title}`});
    fireEvent.click(checkbox);
    await waitFor(() => expect(checkbox).toBeChecked());
    fireEvent.change(within(ownership).getByRole("combobox", {name: "New book owner"}), {target: {value: "owner"}});
}

describe("administration ownership and recovery", () => {
    it("scopes select-all to the current page and resets selection on page or filter changes", async () => {
        const ownership = page();
        fireEvent.click(within(ownership).getByRole("checkbox", {name: "Select all books on this page"}));
        await waitFor(() => expect(within(ownership).getByRole("status")).toHaveTextContent("1 book selected on this page"));
        fireEvent.click(within(ownership).getByRole("button", {name: "Next"}));
        expect(within(ownership).getByRole("status")).toHaveTextContent("0 books selected");
        expect(within(ownership).getByRole("checkbox", {name: "Select Book next"})).not.toBeChecked();
        await select(ownership, "Book next");
        fireEvent.change(within(ownership).getByRole("combobox", {name: "Ownership filter"}), {target: {value: "all"}});
        expect(within(ownership).getByRole("status")).toHaveTextContent("0 books selected");
        expect(mock.assign).not.toHaveBeenCalled();
    });

    it("clears selection immediately when ownership search changes, including page zero", async () => {
        const ownership = page();
        fireEvent.change(within(ownership).getByRole("combobox", {name: "Ownership filter"}), {target: {value: "all"}});
        await select(ownership);
        fireEvent.change(within(ownership).getByRole("textbox", {name: "Search books for ownership"}), {target: {value: "search"}});
        await waitFor(() => expect(within(ownership).getByRole("checkbox", {name: "Select Book search"})).not.toBeChecked());
        expect(within(ownership).getByRole("status")).toHaveTextContent("0 books selected");
        expect(within(ownership).getByRole("button", {name: "Assign ownership"})).toBeDisabled();
    });

    it("names the destination and exact page selection, preserving it after rejection", async () => {
        mock.assign.mockRejectedValueOnce({status: 403}).mockResolvedValueOnce({assigned: 1, failed: 0});
        const ownership = page();
        await select(ownership);
        fireEvent.click(within(ownership).getByRole("button", {name: "Assign ownership"}));
        const dialog = await screen.findByRole("alertdialog", {name: "Assign 1 selected book to Destination Reader?"});
        expect(dialog).toHaveAccessibleDescription(/owner@example.test.*other pages are not affected/i);
        expect(mock.assign).not.toHaveBeenCalled();
        fireEvent.click(within(dialog).getByRole("button", {name: "Assign ownership"}));
        expect(await within(dialog).findByRole("alert")).toHaveTextContent("Your selection is kept");
        expect(within(ownership).getByLabelText("Select Book first")).toBeChecked();
        fireEvent.click(within(dialog).getByRole("button", {name: "Assign ownership"}));
        await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
        expect(mock.assign).toHaveBeenLastCalledWith({bookIds: ["first"], userId: "owner"});
    });

    it("reports partial bulk assignment as a failure and keeps the confirmation open", async () => {
        mock.assign.mockResolvedValue({assigned: 0, failed: 1});
        const ownership = page(); await select(ownership);
        fireEvent.click(within(ownership).getByRole("button", {name: "Assign ownership"}));
        const dialog = await screen.findByRole("alertdialog");
        fireEvent.click(within(dialog).getByRole("button", {name: "Assign ownership"}));
        expect(await within(dialog).findByRole("alert")).toHaveTextContent("1 could not be assigned");
    });

    it("can explicitly clear a previously saved default owner", async () => {
        page();
        fireEvent.change(screen.getByRole("combobox", {name: "Default owner for detected books"}), {target: {value: ""}});
        fireEvent.click(screen.getByRole("button", {name: "Save default owner"}));
        const dialog = await screen.findByRole("alertdialog");
        expect(dialog).toHaveAccessibleDescription(/will be unowned/);
        fireEvent.click(within(dialog).getByRole("button", {name: "Save default owner"}));
        await waitFor(() => expect(mock.save).toHaveBeenCalledWith({key: "default_scan_user_id", value: ""}));
    });

    it("confirms which duplicate is retained and deleted, keeping API failures visible", async () => {
        mock.resolve.mockRejectedValue({status: 500});
        page();
        fireEvent.click(screen.getByRole("button", {name: "Keep existing book"}));
        const dialog = await screen.findByRole("alertdialog");
        expect(dialog).toHaveAccessibleDescription('Keep "Book original" by A. Writer. Delete the new upload "Book upload" by A. Writer.');
        fireEvent.click(within(dialog).getByRole("button", {name: "Keep existing book"}));
        expect(await within(dialog).findByRole("alert")).toHaveTextContent("could not be confirmed");
        expect(mock.resolve).toHaveBeenCalledWith({id: "pair", action: "merge"});
    });

    it("does not treat failed books, jobs, or defaults as empty successful states", () => {
        mock.booksError = true; mock.jobsError = true; mock.settingError = true;
        const ownership = page();
        expect(within(ownership).getByRole("alert")).toHaveTextContent("Books could not be loaded");
        expect(screen.getByRole("region", {name: "Job history"})).toHaveTextContent("Job history could not be loaded");
        expect(screen.queryByRole("button", {name: "Save default owner"})).not.toBeInTheDocument();
        fireEvent.click(within(ownership).getByRole("button", {name: "Try again"}));
        expect(mock.retry).toHaveBeenCalledOnce();
    });

    it("keeps self-hosted ordinary-user file sync/jobs but hides administrator tools", () => {
        sessionStorage.setItem("user_role", "USER");
        expect(clientLoader()).toBeNull();
        render(<Provider><LibraryManagement/></Provider>);
        expect(screen.getByRole("button", {name: "Scan files now"})).toBeVisible();
        expect(screen.getByRole("region", {name: "Job history"})).toBeVisible();
        expect(screen.queryByRole("region", {name: "Book ownership"})).not.toBeInTheDocument();
        expect(screen.queryByRole("region", {name: "Potential duplicates"})).not.toBeInTheDocument();
        mock.cloud = true;
        expect(clientLoader()).toMatchObject({status: 302});
    });

    it("does not infer deleted owners from an unavailable user list", () => {
        mock.usersError = true;
        const ownership = page();
        expect(within(ownership).getByRole("button", {name: "Assign ownership"})).toBeDisabled();
        fireEvent.change(within(ownership).getByRole("combobox", {name: "Ownership filter"}), {target: {value: "orphaned"}});
        expect(mock.orphaned).not.toHaveBeenCalled();
        expect(within(ownership).getByRole("alert")).toHaveTextContent("Load user accounts");
    });
});
