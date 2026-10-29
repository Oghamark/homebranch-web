import {beforeEach, describe, expect, it, vi} from "vitest";
import {fireEvent, render, screen, waitFor, within} from "@testing-library/react";
import {ChakraProvider, defaultSystem} from "@chakra-ui/react";
import {MemoryRouter} from "react-router";
import type {ReactNode} from "react";
import type {BookClub} from "@/entities/bookClub";

const mocks = vi.hoisted(() => ({
    club: undefined as unknown,
    members: [] as unknown[],
    transfer: vi.fn(),
    remove: vi.fn(),
    save: vi.fn(),
    archive: vi.fn(),
    invite: vi.fn(),
}));
vi.mock("@/entities/bookClub", () => ({
    useGetBookClubQuery: () => ({data: mocks.club}),
    useJoinBookClubMutation: () => [vi.fn(), {}],
    useRemoveBookClubMemberMutation: () => [mocks.remove, {}],
    useGetBookClubMembersQuery: () => ({data: mocks.members}),
    useTransferBookClubOwnershipMutation: () => [mocks.transfer, {}],
    useUpdateBookClubMemberMutation: () => [vi.fn(), {}],
    useUpdateBookClubMutation: () => [mocks.save, {}],
    useArchiveBookClubMutation: () => [mocks.archive, {}],
    useDeleteBookClubMutation: () => [vi.fn(), {}],
}));
vi.mock("@uidotdev/usehooks", () => ({useDebounce: (value: string) => value}));
vi.mock("@/entities/social/api", () => ({
    useInviteToClubMutation: () => [mocks.invite, {}],
    useGetOrganizerInvitationsQuery: () => ({data: [], refetch: vi.fn()}),
    useGetFriendsQuery: () => ({data: [], refetch: vi.fn()}),
    useCancelClubInvitationMutation: () => [vi.fn(), {}],
    useSearchPeopleQuery: () => ({currentData: [{id: "new-reader", name: "Morgan"}], refetch: vi.fn()}),
}));
vi.mock("./MemberName", () => ({
    MemberName: ({userId}: {userId: string}) => <>{userId === "owner" ? "Alex Owner" : userId === "moderator" ? "Jordan Moderator" : "Sam Reader"}</>,
    MemberNamesProvider: ({children}: {children: ReactNode}) => children,
}));
vi.mock("./ModerationPanel", () => ({ModerationPanel: ({readOnly}: {readOnly?: boolean}) => <p>{readOnly ? "Read-only moderation records" : "Moderation tools"}</p>}));
import {BookClubManagePage} from "./BookClubManagePage";

const club: BookClub = {id: "club-1", name: "Sunday Readers", visibility: "private", status: "active", ownerUserId: "owner", currentMembershipRole: "owner",
    selectedWork: {id: "work-1", clubId: "club-1", title: "A Good Book", author: "An Author"}};
function renderPage() {
    return render(<ChakraProvider value={defaultSystem}><MemoryRouter initialEntries={["/book-clubs/club-1/manage"]}><BookClubManagePage clubId={club.id}/></MemoryRouter></ChakraProvider>);
}
beforeEach(() => {
    vi.clearAllMocks(); mocks.club = club;
    mocks.members = [{userId: "owner", role: "owner"}, {userId: "moderator", role: "moderator"}, {userId: "member", role: "member"}];
    for (const action of [mocks.transfer, mocks.remove, mocks.save, mocks.archive, mocks.invite]) action.mockReturnValue({unwrap: () => Promise.resolve({})});
});

describe("role-correct organizer management", () => {
    it("shows member names and owner-only settings", () => {
        renderPage();
        expect(screen.getByText("Sam Reader")).toBeVisible();
        expect(screen.getByRole("button", {name: "Save club details"})).toBeVisible();
        expect(screen.getAllByRole("button", {name: "Transfer ownership"})).toHaveLength(2);
        expect(screen.getAllByRole("button", {name: "Remove member"})).toHaveLength(2);
        expect(screen.getByLabelText("Who can find and join this club?")).toHaveValue("private");
        expect(screen.getByText(/They'll decide whether to join/)).toBeVisible();
        expect(screen.queryByRole("button", {name: "Add to club"})).not.toBeInTheDocument();
    });
    it("does not offer moderators owner settings or removal of moderators", () => {
        mocks.club = {...club, currentMembershipRole: "moderator"};
        renderPage();
        expect(screen.queryByRole("button", {name: "Save club details"})).not.toBeInTheDocument();
        expect(screen.queryByRole("button", {name: "Transfer ownership"})).not.toBeInTheDocument();
        expect(screen.queryByRole("button", {name: "Make moderator"})).not.toBeInTheDocument();
        expect(screen.getAllByRole("button", {name: "Remove member"})).toHaveLength(1);
    });
    it("does not mount organizer tools for an ordinary member", () => {
        mocks.club = {...club, currentMembershipRole: "member"};
        renderPage();
        expect(screen.getByText("This space is for club organizers")).toBeVisible();
        expect(screen.queryByText("People")).not.toBeInTheDocument();
        expect(screen.queryByText("Moderation tools")).not.toBeInTheDocument();
    });
    it("only offers read-only records for an archived club", () => {
        mocks.club = {...club, status: "archived"};
        renderPage();
        expect(screen.getByText("Read-only moderation records")).toBeVisible();
        expect(screen.queryByRole("button", {name: "Save club details"})).not.toBeInTheDocument();
        expect(screen.queryByRole("button", {name: "Archive club"})).not.toBeInTheDocument();
        expect(screen.queryByRole("button", {name: "Remove member"})).not.toBeInTheDocument();
    });
    it("names the person and consequences before transferring ownership", async () => {
        renderPage();
        fireEvent.click(screen.getAllByRole("button", {name: "Transfer ownership"})[1]);
        const dialog = await screen.findByRole("alertdialog");
        expect(dialog).toHaveTextContent("Make Sam Reader the club owner?");
        expect(dialog).toHaveTextContent("You will become an ordinary member");
        expect(mocks.transfer).not.toHaveBeenCalled();
        fireEvent.click(within(dialog).getByRole("button", {name: "Transfer ownership"}));
        await waitFor(() => expect(mocks.transfer).toHaveBeenCalledWith({clubId: club.id, newOwnerUserId: "member"}));
    });
    it("requires confirmation before archiving and explains that it cannot be undone", async () => {
        renderPage();
        fireEvent.click(screen.getByText("Advanced club settings"));
        fireEvent.click(screen.getByRole("button", {name: "Archive club"}));
        const dialog = await screen.findByRole("alertdialog");
        expect(dialog).toHaveTextContent("Archiving cannot currently be undone");
        expect(mocks.archive).not.toHaveBeenCalled();
        fireEvent.click(within(dialog).getByRole("button", {name: "Cancel"}));
        expect(mocks.archive).not.toHaveBeenCalled();
    });
    it("saves visibility and details through the existing settings endpoint", async () => {
        renderPage();
        fireEvent.change(screen.getByLabelText("Who can find and join this club?"), {target: {value: "instance_visible"}});
        fireEvent.click(screen.getByRole("button", {name: "Save club details"}));
        await waitFor(() => expect(mocks.save).toHaveBeenCalledWith({clubId: club.id, name: club.name, description: null, visibility: "instance_visible"}));
        expect(await screen.findByText("Club details saved.")).toBeVisible();
    });
    it("sends an ordinary invitation instead of immediately adding a searched account", async () => {
        renderPage();
        fireEvent.change(screen.getByRole("searchbox", {name: "Name or exact email"}), {target: {value: "Morgan"}});
        fireEvent.click(screen.getByRole("button", {name: "Morgan"}));
        expect(mocks.invite).not.toHaveBeenCalled();
        fireEvent.click(screen.getByRole("button", {name: "Send invitation"}));
        await waitFor(() => expect(mocks.invite).toHaveBeenCalledWith({clubId: club.id, userId: "new-reader"}));
        expect(await screen.findByRole("status")).toHaveTextContent("Invitation sent to Morgan.");
        expect(screen.queryByText("new-reader")).not.toBeInTheDocument();
    });
});
