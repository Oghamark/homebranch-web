import {beforeEach, describe, expect, it, vi} from "vitest";
import {fireEvent, render, screen, waitFor, within} from "@testing-library/react";
import {ChakraProvider, defaultSystem} from "@chakra-ui/react";
import {MemoryRouter, Route, Routes} from "react-router";
import type {ReactNode} from "react";
import type {ClubInvitation, NotificationPage, SocialSettings as Preferences} from "@/entities/social/api";

const mocks = vi.hoisted(() => ({
    friends: [{userId: "reader-2", name: "Avery"}],
    requests: {incoming: [{id: "request-1", userId: "reader-3", name: "Rowan", createdAt: "2026-10-01T00:00:00Z"}], outgoing: []},
    people: [{id: "reader-4", name: "Quinn"}],
    invitations: [] as ClubInvitation[],
    notifications: {items: [], total: 0, unreadCount: 0, page: 1, limit: 20} as NotificationPage,
    settings: {allowFriendRequests: true, clubInvites: "anyone"} as Preferences,
    error: false,
    fetching: false,
    action: vi.fn(),
    refetch: vi.fn(),
    refreshOptions: undefined as unknown,
}));
vi.mock("@uidotdev/usehooks", () => ({useDebounce: (value: string) => value}));
vi.mock("@/entities/social/api", () => {
    const query = (data: unknown) => ({data, currentData: data, error: mocks.error, isFetching: mocks.fetching, refetch: mocks.refetch});
    const mutation = () => [(arg: unknown) => ({unwrap: () => mocks.action(arg)}), {}];
    return {
        notificationRefresh: {pollingInterval: 30_000, skipPollingIfUnfocused: true, refetchOnFocus: true, refetchOnReconnect: true},
        useGetFriendsQuery: () => query(mocks.friends),
        useGetFriendRequestsQuery: () => query(mocks.requests),
        useSearchPeopleQuery: () => query(mocks.people),
        useGetClubInvitationsQuery: () => query(mocks.invitations),
        useGetNotificationsQuery: (_page: number, options: unknown) => {mocks.refreshOptions = options; return query(mocks.notifications);},
        useGetSocialSettingsQuery: () => query(mocks.settings),
        useGetBlockedPeopleQuery: () => query([]),
        useBlockPersonMutation: mutation, useRemoveFriendMutation: mutation,
        useRespondToFriendRequestMutation: mutation, useSendFriendRequestMutation: mutation,
        useRespondToClubInvitationMutation: mutation, useMarkNotificationReadMutation: mutation,
        useMarkAllNotificationsReadMutation: mutation, useDismissNotificationMutation: mutation,
        useUpdateSocialSettingsMutation: mutation, useUnblockPersonMutation: mutation,
    };
});

import {FriendsPage} from "./FriendsPage";
import {NotificationsPage, notificationCopy, notificationLink} from "./NotificationsPage";
import {ClubInvitations} from "@/features/social/ClubInvitations";
import {SocialSettings} from "@/features/social/SocialSettings";

function renderUI(content: ReactNode, path = "/friends") {
    return render(<ChakraProvider value={defaultSystem}><MemoryRouter initialEntries={[path]}>
        <Routes><Route path="*" element={content}/><Route path="/book-clubs/club-1" element={<p>Accepted club</p>}/></Routes>
    </MemoryRouter></ChakraProvider>);
}

beforeEach(() => {
    vi.clearAllMocks();
    mocks.error = false; mocks.fetching = false;
    mocks.action.mockResolvedValue({});
    mocks.invitations = [];
    mocks.notifications = {items: [], total: 0, unreadCount: 0, page: 1, limit: 20};
    mocks.settings = {allowFriendRequests: true, clubInvites: "anyone"};
});

describe("private friendship experience", () => {
    it("shows friends by name without exposing emails, identifiers, or library links", () => {
        renderUI(<FriendsPage/>);
        expect(screen.getByText("Avery")).toBeVisible();
        expect(screen.queryByText("reader-2")).not.toBeInTheDocument();
        expect(screen.getByRole("button", {name: "Remove friend"})).toBeVisible();
        expect(screen.getByText(/Your friends list is private/)).toBeVisible();
    });

    it("keeps incoming requests explicit rather than auto-accepting a reversed request", async () => {
        renderUI(<FriendsPage/>, "/friends?view=requests");
        expect(mocks.action).not.toHaveBeenCalled();
        fireEvent.click(screen.getByRole("button", {name: "Accept"}));
        await waitFor(() => expect(mocks.action).toHaveBeenCalledWith({requestId: "request-1", action: "accept"}));
    });

    it("searches by names or exact email but renders only names", async () => {
        renderUI(<FriendsPage/>, "/friends?view=find");
        fireEvent.change(screen.getByRole("searchbox"), {target: {value: "quinn@example.test"}});
        expect(screen.getByText("Quinn")).toBeVisible();
        expect(screen.queryByText("reader-4")).not.toBeInTheDocument();
        expect(screen.queryByText("quinn@example.test")).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", {name: "Send friend request"}));
        await waitFor(() => expect(mocks.action).toHaveBeenCalledWith("reader-4"));
    });

    it("shows a failure instead of cached private friends", () => {
        mocks.error = true;
        renderUI(<FriendsPage/>);
        expect(screen.getByRole("alert")).toHaveTextContent("Your friends couldn't be loaded.");
        expect(screen.queryByText("Avery")).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", {name: "Try again"}));
        expect(mocks.refetch).toHaveBeenCalled();
    });

    it("retains failed actions with explicit server retry guidance", async () => {
        mocks.action.mockRejectedValue({data: {message: "Please wait before sending another request."}});
        renderUI(<FriendsPage/>, "/friends?view=requests");
        fireEvent.click(screen.getByRole("button", {name: "Accept"}));
        expect(await screen.findByRole("alert")).toHaveTextContent("Please wait before sending another request.");
        expect(screen.getByRole("button", {name: "Accept"})).toBeEnabled();
    });
});

describe("club invitation consent", () => {
    function invitation(expiresAt = "2099-01-01T00:00:00Z"): ClubInvitation {
        return {id: "invite-1", clubId: "club-1", clubName: "Sunday Readers", bookTitle: "A Good Book", bookAuthor: "An Author",
            inviterUserId: "organizer", inviterName: "Avery", expiresAt, status: "pending"};
    }
    it("shows a minimal preview and does nothing until the recipient accepts", async () => {
        mocks.invitations = [invitation()];
        renderUI(<ClubInvitations/>, "/book-clubs?view=invitations");
        expect(screen.getByRole("heading", {name: "Sunday Readers"})).toBeVisible();
        expect(screen.queryByRole("link", {name: /Members|Discussions|Reading plan/})).not.toBeInTheDocument();
        expect(mocks.action).not.toHaveBeenCalled();
        fireEvent.click(screen.getByRole("button", {name: "Accept invitation"}));
        expect(await screen.findByText("Accepted club")).toBeVisible();
        expect(mocks.action).toHaveBeenCalledWith({invitationId: "invite-1", action: "accept"});
    });
    it("does not offer stale invitation actions", () => {
        mocks.invitations = [invitation("2020-01-01T00:00:00Z")];
        renderUI(<ClubInvitations/>);
        expect(screen.getByText("This invitation is no longer available.")).toBeVisible();
        expect(screen.queryByRole("button", {name: "Accept invitation"})).not.toBeInTheDocument();
    });
});

describe("durable notification inbox", () => {
    const item = {id: "notification-1", kind: "club_invitation" as const, actorName: "Avery", clubId: "club-1", clubName: "Sunday Readers",
        requestId: "invite-1", createdAt: "2026-10-01T00:00:00Z", readAt: null};
    it("marks read without accepting or declining and retains dedicated request links", async () => {
        mocks.notifications = {items: [item], total: 1, unreadCount: 1, page: 1, limit: 20};
        renderUI(<NotificationsPage/>, "/notifications");
        fireEvent.click(screen.getByRole("button", {name: "Mark read"}));
        await waitFor(() => expect(mocks.action).toHaveBeenCalledWith("notification-1"));
        expect(screen.queryByRole("button", {name: "Accept"})).not.toBeInTheDocument();
        expect(screen.getByRole("link", {name: "View invitations"})).toHaveAttribute("href", "/book-clubs?view=invitations");
        expect(mocks.refreshOptions).toEqual({pollingInterval: 30_000, skipPollingIfUnfocused: true, refetchOnFocus: true, refetchOnReconnect: true});
    });
    it("dismisses only the notification", async () => {
        mocks.notifications = {items: [item], total: 1, unreadCount: 1, page: 1, limit: 20};
        renderUI(<NotificationsPage/>);
        fireEvent.click(screen.getByRole("button", {name: "Dismiss"}));
        await waitFor(() => expect(mocks.action).toHaveBeenCalledExactlyOnceWith("notification-1"));
    });
    it("does not render stale cached notifications after an authorization error", () => {
        mocks.error = true;
        mocks.notifications.items = [item];
        renderUI(<NotificationsPage/>);
        expect(screen.getByRole("alert")).toHaveTextContent("Your notifications couldn't be loaded.");
        expect(screen.queryByText(/Avery invited/)).not.toBeInTheDocument();
    });
    it("uses generic activity copy rather than discussion titles or bodies", () => {
        expect(notificationCopy({...item, kind: "club_discussion"})).toBe("A new discussion in Sunday Readers.");
        expect(notificationLink({...item, kind: "club_reply", threadId: "thread-1"})).toEqual({
            to: "/book-clubs/club-1/discussions?thread=thread-1", label: "View conversation",
        });
    });
});

describe("request settings", () => {
    it("requires confirmation before tightening policies and explains pending-request cancellation", async () => {
        mocks.action.mockResolvedValue({allowFriendRequests: false, clubInvites: "anyone"});
        renderUI(<SocialSettings/>, "/settings?section=privacy");
        fireEvent.click(screen.getByRole("checkbox", {name: "Allow friend requests"}));
        fireEvent.click(screen.getByRole("button", {name: "Save request settings"}));
        const dialog = await screen.findByRole("alertdialog");
        expect(dialog).toHaveTextContent("Pending requests and invitations that no longer match your choices will be canceled.");
        expect(mocks.action).not.toHaveBeenCalled();
        fireEvent.click(within(dialog).getByRole("button", {name: "Save request settings"}));
        await waitFor(() => expect(mocks.action).toHaveBeenCalledWith({allowFriendRequests: false, clubInvites: "anyone"}));
        expect(await screen.findByRole("status")).toHaveTextContent("Your request settings are saved.");
    });
});
