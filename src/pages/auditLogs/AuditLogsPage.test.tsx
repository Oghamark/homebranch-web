import {fireEvent, render, screen} from "@testing-library/react";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {Provider} from "@/shared/ui/provider";
import {AuditLogsPage} from "./AuditLogsPage";
import {clientLoader} from "@/app/routes/dashboard/audit-logs";

const api = vi.hoisted(() => ({
    application: vi.fn(),
    authentication: vi.fn(),
    refetch: vi.fn(),
    failed: false,
    empty: false,
    loading: false,
    businessFailed: false,
}));
vi.mock("@/entities/audit/api", () => ({
    useGetAuditLogsQuery: api.application,
    useGetAuthenticationAuditLogsQuery: api.authentication,
}));

beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    sessionStorage.setItem("user_role", "ADMIN");
    api.failed = false;
    api.empty = false;
    api.loading = false;
    api.businessFailed = false;
    const result = (filters: {offset: number}) => ({
        currentData: api.loading ? undefined : {
            data: api.empty ? [] : [{
                id: "entry", createdAt: "2026-11-27T18:00:00Z", actorId: "user-id", actorLabel: "reader@example.test",
                method: "DELETE", route: "/books/:id/formats/:formatId/file",
                resourceIds: {id: "book-id", formatId: "format-id"}, statusCode: 200, outcome: api.businessFailed ? "failure" : "success",
            }],
            total: api.empty ? 0 : 30, limit: 25, offset: filters.offset,
        },
        isFetching: api.loading, isError: api.failed, refetch: api.refetch,
    });
    api.application.mockImplementation(result);
    api.authentication.mockImplementation(result);
});

function open() {
    return render(<Provider><AuditLogsPage/></Provider>);
}

describe("administrator audit viewer", () => {
    it("shows the actor, action, resource IDs and outcome and supports refresh and pagination", () => {
        open();
        expect(screen.getByText("reader@example.test")).toBeVisible();
        expect(screen.getByText("user-id")).toBeVisible();
        expect(screen.getByText("DELETE /books/:id/formats/:formatId/file")).toBeVisible();
        expect(screen.getByText("formatId: format-id")).toBeVisible();
        expect(screen.getByText("Success (200)")).toBeVisible();
        expect(screen.getByRole("button", {name: "Previous"})).toBeDisabled();
        fireEvent.click(screen.getByRole("button", {name: "Next"}));
        expect(api.application).toHaveBeenLastCalledWith({limit: 25, offset: 25}, {skip: false});
        fireEvent.click(screen.getByRole("button", {name: "Refresh logs"}));
        expect(api.refetch).toHaveBeenCalledOnce();
    });

    it("applies user, action, outcome and date filters and switches log sources without stale pagination", () => {
        open();
        fireEvent.click(screen.getByRole("button", {name: "Next"}));
        fireEvent.change(screen.getByLabelText("User"), {target: {value: "reader"}});
        fireEvent.change(screen.getByLabelText("Action"), {target: {value: "DELETE"}});
        fireEvent.change(screen.getByLabelText("Outcome"), {target: {value: "failure"}});
        fireEvent.change(screen.getByLabelText("From (local time)"), {target: {value: "2026-11-01T10:00"}});
        fireEvent.change(screen.getByLabelText("To (local time)"), {target: {value: "2026-11-27T10:00"}});
        fireEvent.click(screen.getByRole("button", {name: "Apply filters"}));
        const filters = {
            limit: 25, offset: 0, actor: "reader", action: "DELETE", outcome: "failure",
            from: new Date("2026-11-01T10:00").toISOString(), to: new Date("2026-11-27T10:00").toISOString(),
        };
        expect(api.application).toHaveBeenLastCalledWith(filters, {skip: false});
        fireEvent.change(screen.getByLabelText("Log source"), {target: {value: "authentication"}});
        expect(api.application).toHaveBeenLastCalledWith(filters, {skip: true});
        expect(api.authentication).toHaveBeenLastCalledWith(filters, {skip: false});
    });

    it("rejects reversed dates without sending new filters", () => {
        open();
        fireEvent.change(screen.getByLabelText("From (local time)"), {target: {value: "2026-12-01T10:00"}});
        fireEvent.change(screen.getByLabelText("To (local time)"), {target: {value: "2026-11-01T10:00"}});
        fireEvent.click(screen.getByRole("button", {name: "Apply filters"}));
        expect(screen.getByRole("alert")).toHaveTextContent("The start date must not be after the end date.");
        expect(api.application).toHaveBeenLastCalledWith({limit: 25, offset: 0}, {skip: false});
    });

    it("shows business failures even when the HTTP response was successful", () => {
        api.businessFailed = true;
        open();
        expect(screen.getByText("Failure (200)")).toBeVisible();
        expect(screen.queryByText("Success (200)")).not.toBeInTheDocument();
    });

    it("shows loading, explicit failure with retry, and an empty result", () => {
        api.loading = true;
        const {rerender} = open();
        expect(screen.getByText("Loading audit logs...")).toBeVisible();
        api.loading = false; api.failed = true;
        rerender(<Provider><AuditLogsPage/></Provider>);
        expect(screen.getByRole("alert")).toHaveTextContent("Audit logs could not be loaded");
        fireEvent.click(screen.getByRole("button", {name: "Try again"}));
        expect(api.refetch).toHaveBeenCalledOnce();
        api.failed = false; api.empty = true;
        rerender(<Provider><AuditLogsPage/></Provider>);
        expect(screen.getByText("No audit logs found")).toBeVisible();
        expect(screen.getByRole("button", {name: "Next"})).toBeDisabled();
    });

    it("redirects non-administrators and skips both protected log queries", () => {
        sessionStorage.setItem("user_role", "USER");
        expect(clientLoader()).toEqual(expect.objectContaining({status: 302}));
        open();
        expect(screen.getByRole("alert")).toHaveTextContent("Only administrators");
        expect(api.application).toHaveBeenLastCalledWith({limit: 25, offset: 0}, {skip: true});
        expect(api.authentication).toHaveBeenLastCalledWith({limit: 25, offset: 0}, {skip: true});
        expect(screen.queryByText("reader@example.test")).not.toBeInTheDocument();
    });
});
