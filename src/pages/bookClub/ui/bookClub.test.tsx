import {beforeEach, describe, expect, it, vi} from "vitest";
import {fireEvent, render, screen, waitFor, within} from "@testing-library/react";
import {ChakraProvider, defaultSystem} from "@chakra-ui/react";
import {MemoryRouter} from "react-router";
import type {ReactNode} from "react";
import type {BookClub, BookClubSchedule} from "@/entities/bookClub";

const mocks = vi.hoisted(() => ({
    club: undefined as unknown,
    schedule: undefined as unknown,
    copy: {available: false, source: "none", book: null} as unknown,
    clubs: [] as unknown[],
    save: vi.fn(),
    progress: vi.fn(),
    share: vi.fn(),
    refetch: vi.fn(),
    create: vi.fn(),
    copySet: vi.fn(),
    candidates: [] as unknown[],
    copyError: false,
    progressError: false,
}));

vi.mock("@/entities/bookClub", () => ({
    useGetBookClubsQuery: () => ({data: mocks.clubs, refetch: mocks.refetch}),
    useGetArchivedBookClubsQuery: () => ({data: [], refetch: mocks.refetch}),
    useGetBookClubQuery: () => ({data: mocks.club, refetch: mocks.refetch}),
    useGetBookClubScheduleQuery: () => ({data: mocks.schedule, refetch: mocks.refetch}),
    useGetReadingCopyQuery: () => ({data: mocks.copy, refetch: mocks.refetch, error: mocks.copyError}),
    useGetReadingCopyMatchesQuery: () => ({data: mocks.candidates, refetch: mocks.refetch}),
    useCreateBookClubMutation: () => [mocks.create, {reset: vi.fn()}],
    useJoinBookClubMutation: () => [vi.fn(), {}],
    useRemoveBookClubMemberMutation: () => [vi.fn(), {}],
    usePatchBookClubScheduleMutation: () => [mocks.save, {}],
    useSetMilestoneProgressMutation: () => [mocks.progress, {error: mocks.progressError}],
    useSetProgressSharingMutation: () => [mocks.share, {}],
    useSetMilestoneMappingMutation: () => [vi.fn(), {}],
    useClearMilestoneMappingMutation: () => [vi.fn(), {}],
    useClearReadingCopyMutation: () => [vi.fn(), {}],
    useConfirmReadingCopyMatchMutation: () => [mocks.copySet, {}],
    useSetReadingCopyMutation: () => [mocks.copySet, {}],
}));
vi.mock("@/entities/book", () => ({
    AddBookButton: () => <button>Add Book</button>,
    useSearchMyBooksQuery: () => ({data: [], refetch: vi.fn()}),
}));
vi.mock("@/shared", () => ({config: {cloudMode: false}}));
vi.mock("@/shared/config", () => ({config: {apiUrl: "/api", cloudMode: false}}));
vi.mock("./MemberName", () => ({
    MemberName: () => <span>A reader</span>,
    MemberNamesProvider: ({children}: {children: ReactNode}) => children,
}));

import {BookClubsPage, filterClubs} from "./BookClubsPage";
import {readingPlanPayload, ReadingPlanEditor} from "./ReadingPlanEditor";
import {BookClubReadingPlanPage} from "./BookClubReadingPlanPage";
import {ClubShell} from "./ClubShell";
import {ConfirmAction} from "./ClubUI";
import {ReadingCopyPanel} from "./ReadingCopyPanel";

const club: BookClub = {
    id: "club-1", name: "Sunday Readers", description: "A comfortable pace", visibility: "instance_visible",
    status: "active", ownerUserId: "owner", currentMembershipRole: "member",
    selectedWork: {id: "work-1", clubId: "club-1", title: "A Good Book", author: "An Author"},
};
const schedule: BookClubSchedule = {startDate: "2026-11-01", completionDate: null, progressSharingEnabled: false,
    milestones: [{id: "step-1", name: "Part one", kind: "part", position: 1, memberProgress: {status: "in_progress"}, memberMapping: {memberLabel: "Volume I"}}]};
function renderUI(children: ReactNode) {
    return render(<ChakraProvider value={defaultSystem}><MemoryRouter initialEntries={["/book-clubs/club-1"]}>{children}</MemoryRouter></ChakraProvider>);
}

beforeEach(() => {
    vi.clearAllMocks();
    mocks.club = club; mocks.schedule = schedule; mocks.clubs = [club];
    mocks.copy = {available: false, source: "none", book: null}; mocks.candidates = [];
    mocks.copyError = false;
    mocks.progressError = false;
    mocks.save.mockReturnValue({unwrap: () => Promise.resolve({})});
    mocks.progress.mockReturnValue({unwrap: () => Promise.resolve({})});
    mocks.copySet.mockReturnValue({unwrap: () => Promise.resolve({})});
});

describe("book club discovery", () => {
    it("shows the real book cover on club cards", () => {
        mocks.clubs = [{...club, selectedWork: {...club.selectedWork, coverImageFileName: "a good book.jpg"}}];
        const {container} = renderUI(<BookClubsPage/>);
        expect(container.querySelector("img")).toHaveAttribute("src", "/api/uploads/cover-images/a%20good%20book.jpg");
        expect(screen.getByRole("link", {name: /Sunday Readers/})).toBeVisible();
    });

    it("uses the same actual cover in the club header and recovers from a missing image", () => {
        mocks.club = {...club, selectedWork: {...club.selectedWork, coverImageFileName: "orchard.jpg"}};
        const {container} = renderUI(<ClubShell clubId={club.id}>{() => <p>Club content</p>}</ClubShell>);
        const image = container.querySelector("img")!;
        expect(image).toHaveAttribute("src", "/api/uploads/cover-images/orchard.jpg");
        fireEvent.error(image);
        expect(container.querySelector("img")).toBeNull();
        expect(screen.getByRole("heading", {name: club.name})).toBeVisible();
        expect(screen.getByText("Club content")).toBeVisible();
    });

    it("separates memberships from discoverable clubs and searches book metadata", () => {
        const other = {...club, id: "club-2", name: "A different club", currentMembershipRole: null};
        expect(filterClubs([club, other], "mine", "author")).toEqual([club]);
        expect(filterClubs([club, other], "discover", "different")).toEqual([other]);
        expect(filterClubs([club, other], "mine", "not present")).toEqual([]);
    });
    it("defaults to My clubs and keeps creation focused and library-only", async () => {
        renderUI(<BookClubsPage/>);
        expect(screen.getByRole("button", {name: "My clubs"})).toHaveAttribute("aria-current", "page");
        expect(screen.queryByLabelText("Club name")).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", {name: "Create club"}));
        expect(await screen.findByLabelText("Club name")).toBeVisible();
        expect(screen.getByText(/Choose a book you've added to your own library/)).toBeVisible();
        const submit = screen.getAllByRole("button", {name: /Create club/}).find(button => button.getAttribute("type") === "submit");
        expect(submit).toBeDisabled();
        expect(screen.queryByLabelText("Author")).not.toBeInTheDocument();
    });
});

describe("safe reading plan editing", () => {
    it("omits milestone replacement for date-only changes", () => {
        expect(readingPlanPayload(schedule, "2026-11-02", "", [{key: "step-1", id: "step-1", name: "Part one", kind: "part"}]))
            .toEqual({startDate: "2026-11-02", completionDate: null});
    });
    it("retains step IDs and kinds when a step is renamed", () => {
        expect(readingPlanPayload(schedule, "", "", [{key: "step-1", id: "step-1", name: "Opening part", kind: "part"}]).milestones)
            .toEqual([{id: "step-1", name: "Opening part", kind: "part", position: 1}]);
    });
    it("saves date edits without progress-resetting milestones", async () => {
        renderUI(<ReadingPlanEditor clubId={club.id} schedule={schedule} onSaved={vi.fn()}/>);
        fireEvent.change(screen.getByLabelText("Start date (optional)"), {target: {value: "2026-11-03"}});
        fireEvent.click(screen.getByRole("button", {name: "Save reading plan"}));
        await waitFor(() => expect(mocks.save).toHaveBeenCalledWith({clubId: club.id, startDate: "2026-11-03", completionDate: null}));
    });
    it("requires explicit confirmation before deleting step progress", async () => {
        renderUI(<ReadingPlanEditor clubId={club.id} schedule={schedule} onSaved={vi.fn()}/>);
        fireEvent.click(screen.getByRole("button", {name: "Remove step 1"}));
        fireEvent.click(screen.getByRole("button", {name: "Save reading plan"}));
        expect(mocks.save).not.toHaveBeenCalled();
        expect(await screen.findByRole("alertdialog")).toHaveTextContent("everyone's club progress");
        fireEvent.click(screen.getAllByRole("button", {name: "Save reading plan"}).at(-1)!);
        await waitFor(() => expect(mocks.save).toHaveBeenCalledWith({clubId: club.id, startDate: "2026-11-01", completionDate: null, milestones: []}));
    });
});

describe("member reading experience", () => {
    it("does not offer progress writes without a usable reading copy", () => {
        renderUI(<BookClubReadingPlanPage clubId={club.id}/>);
        expect(screen.getByRole("button", {name: /Choose your copy/})).toBeVisible();
        expect(screen.queryByRole("button", {name: "Mark complete"})).not.toBeInTheDocument();
        expect(screen.getByRole("checkbox", {name: "Share my reading progress"})).not.toBeChecked();
        expect(screen.queryByRole("button", {name: "Edit reading plan"})).not.toBeInTheDocument();
    });
    it("marks a step complete in one action when a copy is available", async () => {
        mocks.copy = {available: true, source: "personal", book: {id: "book-1", title: "A Good Book", author: "An Author"}};
        renderUI(<BookClubReadingPlanPage clubId={club.id}/>);
        fireEvent.click(screen.getByRole("button", {name: "Mark complete"}));
        await waitFor(() => expect(mocks.progress).toHaveBeenCalledWith({clubId: club.id, milestoneId: "step-1", status: "completed"}));
        expect(await screen.findByRole("status")).toHaveTextContent("Saved.");
        expect(screen.getByLabelText("Different chapter names in your edition?")).not.toBeVisible();
    });
    it("preserves private label drafts through a schedule refetch", () => {
        mocks.copy = {available: true, source: "personal", book: {id: "book-1", title: "A Good Book", author: "An Author"}};
        const view = renderUI(<BookClubReadingPlanPage clubId={club.id}/>);
        fireEvent.click(screen.getByText("Progress and edition options"));
        fireEvent.change(screen.getByLabelText("Different chapter names in your edition?"), {target: {value: "My opening chapter"}});
        mocks.schedule = {...schedule, completionDate: "2026-12-01"};
        view.rerender(<ChakraProvider value={defaultSystem}><MemoryRouter><BookClubReadingPlanPage clubId={club.id}/></MemoryRouter></ChakraProvider>);
        expect(screen.getByLabelText("Different chapter names in your edition?")).toHaveValue("My opening chapter");
    });
    it("does not report failed progress writes as saved", async () => {
        mocks.copy = {available: true, source: "personal", book: {id: "book-1", title: "A Good Book", author: "An Author"}};
        mocks.progress.mockReturnValue({unwrap: () => Promise.reject(new Error("offline"))});
        mocks.progressError = true;
        renderUI(<BookClubReadingPlanPage clubId={club.id}/>);
        fireEvent.click(screen.getByRole("button", {name: "Mark complete"}));
        await waitFor(() => expect(mocks.progress).toHaveBeenCalled());
        expect(screen.getByRole("alert")).toHaveTextContent("couldn't be saved");
        expect(screen.queryByText("Saved.")).not.toBeInTheDocument();
    });
    it("keeps archived reading plans read-only", () => {
        mocks.club = {...club, status: "archived", currentMembershipRole: "owner"};
        renderUI(<BookClubReadingPlanPage clubId={club.id}/>);
        expect(screen.queryByRole("button", {name: "Mark complete"})).not.toBeInTheDocument();
        expect(screen.queryByRole("button", {name: "Edit reading plan"})).not.toBeInTheDocument();
        expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    });
    it("requires a choice before confirming a suggested copy", async () => {
        mocks.candidates = [{bookId: "book-1", title: "A Good Book", author: "An Author", method: "identifier", confidence: 1}];
        renderUI(<ReadingCopyPanel club={club}/>);
        expect(mocks.copySet).not.toHaveBeenCalled();
        fireEvent.click(screen.getByRole("button", {name: /Choose your copy/}));
        fireEvent.click(await screen.findByRole("button", {name: "Choose this copy"}));
        await waitFor(() => expect(mocks.copySet).toHaveBeenCalledWith({clubId: club.id, workId: "work-1", bookId: "book-1"}));
    });
});

describe("club permissions and confirmations", () => {
    it("shows a non-member joining preview rather than member content", () => {
        mocks.club = {...club, currentMembershipRole: null};
        renderUI(<ClubShell clubId={club.id}>{() => <p>Private member content</p>}</ClubShell>);
        expect(screen.getByRole("button", {name: "Join club"})).toBeVisible();
        expect(screen.queryByText("Private member content")).not.toBeInTheDocument();
        expect(screen.queryByRole("navigation", {name: "Club navigation"})).not.toBeInTheDocument();
    });
    it("does not show organizer navigation to ordinary members", () => {
        renderUI(<ClubShell clubId={club.id}>{() => <p>Member home</p>}</ClubShell>);
        expect(screen.queryByRole("link", {name: "Manage"})).not.toBeInTheDocument();
        expect(screen.getByRole("link", {name: "Home"})).toHaveAttribute("aria-current", "page");
    });
    it("keeps a failed destructive confirmation open with an explicit error", async () => {
        const action = vi.fn().mockRejectedValue(new Error("offline"));
        renderUI(<ConfirmAction title="Delete club?" description="This cannot be undone." actionLabel="Delete club" onConfirm={action} destructive/>);
        fireEvent.click(screen.getByRole("button", {name: "Delete club"}));
        fireEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", {name: "Delete club"}));
        expect(await screen.findByRole("alert")).toHaveTextContent("could not be saved");
        expect(screen.getByRole("alertdialog")).toBeVisible();
    });
});
