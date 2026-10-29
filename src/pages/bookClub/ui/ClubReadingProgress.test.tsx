import {beforeEach, describe, expect, it, vi} from "vitest";
import {fireEvent, render, screen, within} from "@testing-library/react";
import {ChakraProvider, defaultSystem} from "@chakra-ui/react";
import type {ReactNode} from "react";
import type {BookClubSchedule} from "@/entities/bookClub";
import {ClubReadingProgress} from "./ClubReadingProgress";

vi.mock("./MemberName", () => ({
    MemberNamesProvider: ({children}: {children: ReactNode}) => children,
    MemberName: ({userId}: {userId: string}) => <>{userId === "me" ? "Alex Reader" : userId === "other" ? "Jordan Reader" : "Sam Newcomer"}</>,
}));
const schedule: BookClubSchedule = {
    milestones: [
        {id: "first", name: "Opening chapters", kind: "chapter", position: 1, memberMapping: {memberLabel: "My secret edition label"}},
        {id: "last", name: "The final chapter", kind: "chapter", position: 2},
    ],
    sharedProgress: [
        {userId: "me", milestones: [{milestoneId: "first", status: "completed", percentage: null}, {milestoneId: "last", status: "in_progress", percentage: 40}]},
        {userId: "other", milestones: [{milestoneId: "first", status: "completed", percentage: null}, {milestoneId: "last", status: "completed", percentage: null}]},
        {userId: "new", milestones: [{milestoneId: "first", status: "not_started", percentage: null}, {milestoneId: "last", status: "not_started", percentage: null}]},
    ],
};
function renderProgress(data = schedule) {
    return render(<ChakraProvider value={defaultSystem}><ClubReadingProgress schedule={data}/></ChakraProvider>);
}
beforeEach(() => {sessionStorage.clear(); sessionStorage.setItem("user_id", "me");});

describe("all-member club reading progress", () => {
    it("includes the viewer, other members, and members who have not started", () => {
        renderProgress();
        expect(screen.getByRole("heading", {name: "Alex Reader"})).toBeVisible();
        expect(screen.getByRole("heading", {name: "Jordan Reader"})).toBeVisible();
        expect(screen.getByRole("heading", {name: "Sam Newcomer"})).toBeVisible();
        expect(screen.getByText("You")).toBeVisible();
        expect(screen.getByText("0 of 2 steps complete")).toBeVisible();
        expect(screen.getByText("Not started", {selector: "p"})).toBeVisible();
        expect(screen.getByRole("progressbar", {name: "Alex Reader"})).toHaveAttribute("aria-valuenow", "50");
        expect(screen.getByRole("progressbar", {name: "Jordan Reader"})).toHaveAttribute("aria-valuenow", "100");
        expect(screen.getByRole("progressbar", {name: "Sam Newcomer"})).toHaveAttribute("aria-valuenow", "0");
        expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    });
    it("shows per-step status and percentage without private edition mappings", () => {
        const {container} = renderProgress();
        fireEvent.click(screen.getAllByText("View reading steps")[0]);
        const firstMember = container.querySelector("li")!;
        expect(within(firstMember).getByText("Opening chapters")).toBeVisible();
        expect(within(firstMember).getByText("Complete", {exact: true})).toBeVisible();
        expect(within(firstMember).getByText("In progress · 40%")).toBeVisible();
        expect(screen.queryByText("My secret edition label")).not.toBeInTheDocument();
    });
    it("keeps all members visible when there is no plan, without invalid progress bars", () => {
        renderProgress({...schedule, milestones: [], sharedProgress: schedule.sharedProgress!.map(member => ({...member, milestones: []}))});
        expect(screen.getAllByText("Reading plan not set yet")).toHaveLength(3);
        expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    });
    it("updates the group summary after completion and undo", () => {
        const view = renderProgress();
        const updated = {...schedule, sharedProgress: schedule.sharedProgress!.map(member => member.userId === "me" ? {
            ...member, milestones: member.milestones.map(step => ({...step, status: "completed" as const})),
        } : member)};
        view.rerender(<ChakraProvider value={defaultSystem}><ClubReadingProgress schedule={updated}/></ChakraProvider>);
        expect(screen.getByRole("progressbar", {name: "Alex Reader"})).toHaveAttribute("aria-valuenow", "100");
        view.rerender(<ChakraProvider value={defaultSystem}><ClubReadingProgress schedule={schedule}/></ChakraProvider>);
        expect(screen.getByRole("progressbar", {name: "Alex Reader"})).toHaveAttribute("aria-valuenow", "50");
    });
});
