import {fireEvent, render, screen, waitFor} from "@testing-library/react";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {MemoryRouter} from "react-router";
import {Provider} from "@/shared/ui/provider";
import {KoreaderSettings} from "./KoreaderSettings";
import {approvePairing, getDevices, revokeDevice} from "./api";
vi.mock("./api", () => ({approvePairing: vi.fn(), getDevices: vi.fn(), revokeDevice: vi.fn()}));
vi.mock("@/shared/api/axios", () => ({axiosInstance: {defaults: {baseURL: "/api/"}}}));
beforeEach(() => {
    vi.mocked(getDevices).mockReset().mockResolvedValue([{id: "device", name: "My reader", createdAt: "2026-10-01T00:00:00Z", lastSeenAt: null, expiresAt: "2027-10-01T00:00:00Z"}]);
    vi.mocked(approvePairing).mockReset().mockResolvedValue();
    vi.mocked(revokeDevice).mockReset().mockResolvedValue();
});
describe("personal KOReader settings", () => {
    it("requires explicit approval even with a deep-linked code and supports revocation", async () => {
        render(<Provider><MemoryRouter initialEntries={["/settings?section=koreader&code=ABC123"]}><KoreaderSettings/></MemoryRouter></Provider>);
        expect(screen.getByRole("textbox", {name: "Reader approval code"})).toHaveValue("ABC123");
        expect(approvePairing).not.toHaveBeenCalled();
        fireEvent.click(screen.getByRole("button", {name: "Approve this reader"}));
        await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Reader approved"));
        expect(approvePairing).toHaveBeenCalledWith("ABC123");
        fireEvent.click(screen.getByRole("button", {name: "Revoke My reader"}));
        await waitFor(() => expect(revokeDevice).toHaveBeenCalledWith("device"));
        expect(screen.getByText(/Plugin sync URL/)).toHaveTextContent("/api/koreader");
        expect(screen.getByText(/OPDS catalog:/)).toHaveTextContent("/api/opds/v1/catalog");
    });
    it("reports approval and device API failures without claiming success", async () => {
        vi.mocked(getDevices).mockRejectedValue(new Error("offline"));
        vi.mocked(approvePairing).mockRejectedValue(new Error("expired"));
        render(<Provider><MemoryRouter><KoreaderSettings/></MemoryRouter></Provider>);
        await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Unable to load"));
        fireEvent.change(screen.getByRole("textbox", {name: "Reader approval code"}), {target: {value: "EXPIRED"}});
        fireEvent.click(screen.getByRole("button", {name: "Approve this reader"}));
        await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Approval failed"));
        expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });
});
