import {cloneElement, isValidElement, type ReactNode} from "react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {cleanup, fireEvent, render, screen, waitFor, within} from "@testing-library/react";
import {ChakraProvider, defaultSystem} from "@chakra-ui/react";
import {MemoryRouter} from "react-router";
import type {BookClub, DiscussionReply, DiscussionThread} from "@/entities/bookClub";
import {DiscussionsPage} from "./DiscussionsPage";
import {ModerationPanel} from "./ModerationPanel";

const fixture = vi.hoisted(() => ({
    club: {} as BookClub,
    threads: [] as DiscussionThread[],
    replies: [] as DiscussionReply[],
    createError: false,
    readDenied: false,
    readFetching: false,
    bodyScrubbed: false,
    fetchThread: vi.fn(),
    fetchReply: vi.fn(),
    createThread: vi.fn(),
    updateThread: vi.fn(),
    deleteThread: vi.fn(),
    moderateThread: vi.fn(),
    mutation: vi.fn(),
    refetch: vi.fn(),
}));

vi.mock("./ClubShell", () => ({
    ClubShell: ({children}: {children: (club: BookClub) => ReactNode}) => children(fixture.club),
}));
vi.mock("./MemberName", () => ({
    MemberNamesProvider: ({children}: {children: ReactNode}) => children,
    MemberName: () => <>A reader</>,
}));
vi.mock("@/entities/bookClub", async () => {
    const {useState} = await import("react");
    return {
        useGetDiscussionThreadsQuery: () => ({currentData: fixture.threads, refetch: fixture.refetch}),
        useGetDiscussionRepliesQuery: () => ({currentData: fixture.replies, refetch: fixture.refetch}),
        useGetDiscussionRecoveryTargetsQuery: () => ({currentData: [{id: "private-target-id", type: "thread", hidden: true, deleted: false}], refetch: fixture.refetch}),
        useGetDiscussionAuditQuery: () => ({currentData: [], refetch: fixture.refetch}),
        useLazyGetDiscussionThreadQuery: () => {
            const [currentData, setData] = useState<DiscussionThread>();
            return [(args: unknown) => ({unwrap: async () => {
                const data = await fixture.fetchThread(args);
                setData(data);
                return data;
            }}), {currentData: fixture.bodyScrubbed && currentData ? {...currentData, body: undefined} : currentData, isError: fixture.readDenied, isFetching: fixture.readFetching}];
        },
        useLazyGetDiscussionReplyQuery: () => {
            const [currentData, setData] = useState<DiscussionReply>();
            return [(args: unknown) => ({unwrap: async () => {
                const data = await fixture.fetchReply(args);
                setData(data);
                return data;
            }}), {currentData}];
        },
        useCreateDiscussionThreadMutation: () => [fixture.createThread, {error: fixture.createError}],
        useUpdateDiscussionThreadMutation: () => [fixture.updateThread, {}],
        useDeleteDiscussionThreadMutation: () => [fixture.deleteThread, {}],
        useModerateDiscussionThreadMutation: () => [fixture.moderateThread, {}],
        useCreateDiscussionReplyMutation: () => [fixture.mutation, {}],
        useUpdateDiscussionReplyMutation: () => [fixture.mutation, {}],
        useDeleteDiscussionReplyMutation: () => [fixture.mutation, {}],
        useModerateDiscussionReplyMutation: () => [fixture.mutation, {}],
    };
});

function mount(path = "/book-clubs/club/discussions", element: ReactNode = <DiscussionsPage clubId="club"/>) {
    const content = () => <ChakraProvider value={defaultSystem}><MemoryRouter initialEntries={[path]}>{isValidElement(element) ? cloneElement(element) : element}</MemoryRouter></ChakraProvider>;
    const view = render(content());
    return {...view, refresh: () => view.rerender(content())};
}

beforeEach(() => {
    vi.resetAllMocks();
    sessionStorage.setItem("user_id", "reader");
    fixture.club = {id: "club", name: "Reading together", status: "active", currentMembershipRole: "member"} as BookClub;
    fixture.threads = [{
        id: "thread", clubId: "club", authorUserId: "reader", title: "A thoughtful question",
        spoiler: true, pinned: false, locked: false, promptKind: false,
        createdAt: "2026-10-01T12:00:00Z", updatedAt: "2026-10-01T12:00:00Z",
    }];
    fixture.replies = [{
        id: "reply", clubId: "club", threadId: "thread", authorUserId: "another-reader", spoiler: true,
        createdAt: "2026-10-02T12:00:00Z", updatedAt: "2026-10-02T12:00:00Z",
    }];
    fixture.createError = false;
    fixture.readDenied = false;
    fixture.readFetching = false;
    fixture.bodyScrubbed = false;
    for (const mutation of [fixture.createThread, fixture.updateThread, fixture.deleteThread, fixture.moderateThread, fixture.mutation]) {
        mutation.mockReturnValue({unwrap: async () => undefined});
    }
    fixture.fetchThread.mockResolvedValue({...fixture.threads[0], body: "The secret ending"});
    fixture.fetchReply.mockResolvedValue({...fixture.replies[0], body: "A secret reply"});
});
afterEach(cleanup);

describe("discussions", () => {
    it("starts with conversations, real thread links, names, dates, and a closed composer", () => {
        mount();
        expect(screen.getByRole("link", {name: "A thoughtful question"})).toHaveAttribute("href", "/book-clubs/club/discussions?thread=thread");
        expect(screen.getByText(/A reader/)).toBeVisible();
        expect(document.querySelector("time")).toHaveAttribute("datetime", "2026-10-01T12:00:00Z");
        expect(screen.queryByRole("button", {name: "Post discussion"})).not.toBeInTheDocument();
        expect(fixture.fetchThread).not.toHaveBeenCalled();
        expect(fixture.fetchReply).not.toHaveBeenCalled();
        fireEvent.click(screen.getByRole("button", {name: "Start a discussion"}));
        expect(screen.getByRole("button", {name: "Post discussion"})).toBeVisible();
    });

    it("reveals only the explicitly selected spoiler and keeps thread navigation in the same club", async () => {
        mount("/book-clubs/club/discussions?thread=thread");
        expect(screen.getByRole("link", {name: "Back to discussions"})).toHaveAttribute("href", "/book-clubs/club/discussions");
        expect(screen.queryByText("The secret ending")).not.toBeInTheDocument();
        expect(fixture.fetchThread).not.toHaveBeenCalled();
        fireEvent.click(screen.getAllByRole("button", {name: "Show spoiler"})[0]);
        expect(await screen.findByText("The secret ending")).toBeVisible();
        expect(fixture.fetchThread).toHaveBeenCalledExactlyOnceWith({clubId: "club", threadId: "thread", revealSpoilers: true});
        expect(fixture.fetchReply).not.toHaveBeenCalled();
        expect(screen.queryByText("A secret reply")).not.toBeInTheDocument();
        expect(screen.queryByRole("button", {name: "Open"})).not.toBeInTheDocument();
    });

    it("loads the full authorized spoiler body before editing and preserves its warning on save", async () => {
        mount("/book-clubs/club/discussions?thread=thread");
        const summary = screen.getByLabelText("Discussion actions");
        fireEvent.click(summary);
        summary.parentElement?.setAttribute("open", "");
        fireEvent.click(screen.getByRole("button", {name: "Edit (loads spoiler)"}));
        expect(await screen.findByDisplayValue("The secret ending")).toBeVisible();
        expect(fixture.fetchThread).toHaveBeenCalledWith({clubId: "club", threadId: "thread", revealSpoilers: true});
        fireEvent.click(screen.getByRole("button", {name: "Save changes"}));
        await waitFor(() => expect(fixture.updateThread).toHaveBeenCalledWith({
            clubId: "club", threadId: "thread", title: "A thoughtful question", body: "The secret ending", spoiler: true,
        }));
    });

    it("reveals a selected reply without fetching the thread or other replies", async () => {
        mount("/book-clubs/club/discussions?thread=thread");
        fireEvent.click(screen.getAllByRole("button", {name: "Show spoiler"})[1]);
        expect(await screen.findByText("A secret reply")).toBeVisible();
        expect(fixture.fetchReply).toHaveBeenCalledExactlyOnceWith({clubId: "club", replyId: "reply", revealSpoilers: true});
        expect(fixture.fetchThread).not.toHaveBeenCalled();
    });

    it("hides a cached revealed body during reauthorization and after access is denied", async () => {
        const view = mount("/book-clubs/club/discussions?thread=thread");
        fireEvent.click(screen.getAllByRole("button", {name: "Show spoiler"})[0]);
        expect(await screen.findByText("The secret ending")).toBeVisible();
        fixture.readFetching = true;
        view.refresh();
        expect(screen.queryByText("The secret ending")).not.toBeInTheDocument();
        fixture.readFetching = false;
        fixture.readDenied = true;
        view.refresh();
        expect(screen.queryByText("The secret ending")).not.toBeInTheDocument();
    });

    it("removes an open editor if the discussion becomes locked", async () => {
        const view = mount("/book-clubs/club/discussions?thread=thread");
        screen.getByLabelText("Discussion actions").parentElement?.setAttribute("open", "");
        fireEvent.click(screen.getByRole("button", {name: "Edit (loads spoiler)"}));
        expect(await screen.findByDisplayValue("The secret ending")).toBeVisible();
        fixture.threads = [{...fixture.threads[0], locked: true}];
        view.refresh();
        expect(screen.queryByRole("button", {name: "Save changes"})).not.toBeInTheDocument();
        expect(screen.queryByDisplayValue("The secret ending")).not.toBeInTheDocument();
        expect(fixture.updateThread).not.toHaveBeenCalled();
    });

    it("hides a local spoiler draft immediately when its authorized cache body is scrubbed", async () => {
        const view = mount("/book-clubs/club/discussions?thread=thread");
        screen.getByLabelText("Discussion actions").parentElement?.setAttribute("open", "");
        fireEvent.click(screen.getByRole("button", {name: "Edit (loads spoiler)"}));
        expect(await screen.findByDisplayValue("The secret ending")).toBeVisible();
        fixture.bodyScrubbed = true;
        view.refresh();
        expect(screen.queryByDisplayValue("The secret ending")).not.toBeInTheDocument();
        expect(screen.queryByRole("button", {name: "Save changes"})).not.toBeInTheDocument();
        expect(fixture.updateThread).not.toHaveBeenCalled();
    });

    it("retains edited spoiler text after a failed save", async () => {
        fixture.updateThread.mockReturnValue({unwrap: async () => {throw new Error("offline");}});
        mount("/book-clubs/club/discussions?thread=thread");
        screen.getByLabelText("Discussion actions").parentElement?.setAttribute("open", "");
        fireEvent.click(screen.getByRole("button", {name: "Edit (loads spoiler)"}));
        fireEvent.change(await screen.findByDisplayValue("The secret ending"), {target: {value: "My revised spoiler"}});
        fireEvent.click(screen.getByRole("button", {name: "Save changes"}));
        expect(await screen.findByRole("alert")).toHaveTextContent("Your draft is intact");
        expect(screen.getByDisplayValue("My revised spoiler")).toBeVisible();
    });

    it("does not open an empty spoiler editor when loading fails", async () => {
        fixture.fetchThread.mockRejectedValue(new Error("offline"));
        mount("/book-clubs/club/discussions?thread=thread");
        const summary = screen.getByLabelText("Discussion actions");
        summary.parentElement?.setAttribute("open", "");
        fireEvent.click(screen.getByRole("button", {name: "Edit (loads spoiler)"}));
        expect(await screen.findByRole("alert")).toHaveTextContent("Nothing has been changed");
        expect(screen.queryByRole("button", {name: "Save changes"})).not.toBeInTheDocument();
        expect(fixture.updateThread).not.toHaveBeenCalled();
    });

    it("preserves a failed discussion draft and keeps it when the composer closes and reopens", async () => {
        fixture.createError = true;
        fixture.createThread.mockReturnValue({unwrap: async () => {throw new Error("offline");}});
        mount();
        fireEvent.click(screen.getByRole("button", {name: "Start a discussion"}));
        fireEvent.change(screen.getByLabelText("Title"), {target: {value: "My draft title"}});
        fireEvent.change(screen.getByLabelText("What would you like to share?"), {target: {value: "My unsaved thoughts"}});
        fireEvent.click(screen.getByRole("button", {name: "Post discussion"}));
        await waitFor(() => expect(fixture.createThread).toHaveBeenCalled());
        expect(screen.getByRole("alert")).toHaveTextContent("Your draft is safe");
        expect(screen.getByDisplayValue("My unsaved thoughts")).toBeVisible();
        fireEvent.click(screen.getByRole("button", {name: "Close composer"}));
        fireEvent.click(screen.getByRole("button", {name: "Start a discussion"}));
        expect(screen.getByDisplayValue("My draft title")).toBeVisible();
    });

    it("confirms author deletion before sending the mutation", async () => {
        mount("/book-clubs/club/discussions?thread=thread");
        screen.getByLabelText("Discussion actions").parentElement?.setAttribute("open", "");
        fireEvent.click(screen.getByRole("button", {name: "Delete my discussion"}));
        expect(fixture.deleteThread).not.toHaveBeenCalled();
        const dialog = await screen.findByRole("alertdialog");
        fireEvent.click(within(dialog).getByRole("button", {name: "Delete my discussion"}));
        await waitFor(() => expect(fixture.deleteThread).toHaveBeenCalledWith({clubId: "club", threadId: "thread"}));
    });

    it.each(["archived", "locked"])("makes %s discussions read-only to authors", mode => {
        if (mode === "archived") fixture.club.status = "archived";
        else fixture.threads[0].locked = true;
        mount("/book-clubs/club/discussions?thread=thread");
        expect(screen.queryByLabelText("Discussion actions")).not.toBeInTheDocument();
        expect(screen.queryByRole("button", {name: "Post reply"})).not.toBeInTheDocument();
        expect(screen.getAllByRole("button", {name: "Show spoiler"})).toHaveLength(2);
    });

    it("keeps archived recovery metadata-only and hides all restore actions", () => {
        mount("/book-clubs/club/manage", <ModerationPanel clubId="club" owner readOnly/>);
        fireEvent.click(screen.getByRole("button", {name: "Review moderated posts"}));
        expect(screen.getByText("Discussion 1")).toBeVisible();
        expect(screen.queryByText("private-target-id")).not.toBeInTheDocument();
        expect(screen.queryByRole("button", {name: "Restore post"})).not.toBeInTheDocument();
        expect(screen.getByRole("button", {name: "View moderation history"})).toBeVisible();
        expect(fixture.fetchThread).not.toHaveBeenCalled();
    });

    it("keeps audit history owner-only", () => {
        mount("/book-clubs/club/manage", <ModerationPanel clubId="club" owner={false}/>);
        expect(screen.queryByRole("button", {name: "View moderation history"})).not.toBeInTheDocument();
    });
});
