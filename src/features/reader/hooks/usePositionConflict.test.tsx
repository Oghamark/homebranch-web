import {act, renderHook, waitFor} from "@testing-library/react";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {Locator, LocatorLocations} from "@readium/shared";
import type {EpubNavigator} from "@readium/navigator";
import {getSavedPosition} from "../api/savedPositionApi";
import {getCrossReaderProgress} from "@/features/koreader/api";
import {usePositionConflict} from "./usePositionConflict";
import {installMemoryStorage} from "@/test/memoryStorage";
vi.mock("../api/savedPositionApi", () => ({getSavedPosition: vi.fn()}));
vi.mock("@/features/koreader/api", () => ({getCrossReaderProgress: vi.fn()}));
vi.mock("@/shared/lib/toast/toast", () => ({default: vi.fn()}));
const saved = vi.mocked(getSavedPosition), cross = vi.mocked(getCrossReaderProgress);
const locator = new Locator({href: "http://localhost/epub/two.xhtml", type: "application/xhtml+xml", locations: new LocatorLocations({progression: 0.2, totalProgression: 0.6})});
const remote = {percentage: 0.6, source: "koreader" as const, accuracy: "approximate" as const, device: "KOReader", revision: "2", updatedAt: "2026-10-01T00:00:00Z"};
beforeEach(() => {
    installMemoryStorage(); sessionStorage.setItem("user_id", "account");
    saved.mockReset(); cross.mockReset(); saved.mockResolvedValue(null); cross.mockResolvedValue(remote);
});
function setup() {
    const enabled = {current: false};
    const go = vi.fn((_loc, _animated, callback) => callback(true));
    const nav = {current: {go, currentLocator: locator} as unknown as EpubNavigator};
    const change = vi.fn(), immediate = vi.fn(async () => {});
    const resolve = (position: Locator) => position;
    const percentage = vi.fn(() => locator);
    const hook = renderHook(() => usePositionConflict("book", nav, "Browser", true, change, immediate, resolve, {current: "http://localhost/epub/"}, enabled, percentage));
    return {...hook, enabled, go, change, percentage};
}
describe("startup cross-reader position choice", () => {
    it("pauses saves until explicitly accepting the approximate jump", async () => {
        const hook = setup();
        expect(hook.enabled.current).toBe(false);
        await waitFor(() => expect(hook.result.current.modalCase?.type).toBe("approximate"));
        expect(hook.enabled.current).toBe(false);
        expect(hook.percentage).toHaveBeenCalledWith(0.6);
        act(() => hook.result.current.handleJump(locator));
        expect(hook.enabled.current).toBe(true);
        expect(hook.go).toHaveBeenCalledWith(locator, true, expect.any(Function));
        expect(hook.change).toHaveBeenCalledWith(locator, 0.6);
    });
    it("does not offer KOReader progress older than an unsynced local web save", async () => {
        localStorage.setItem("reader_position_time_account_book", String(Date.parse("2026-10-02T00:00:00Z")));
        const hook = setup();
        await waitFor(() => expect(hook.enabled.current).toBe(true));
        expect(hook.result.current.modalCase).toBeNull();
        expect(hook.percentage).not.toHaveBeenCalled();
    });
    it("preserves the existing exact web position prompt when web was latest", async () => {
        cross.mockResolvedValue({...remote, source: "web", accuracy: "exact"});
        saved.mockResolvedValue({bookId: "book", userId: "account", position: JSON.stringify(locator.serialize()), deviceName: "Other browser", createdAt: remote.updatedAt, updatedAt: remote.updatedAt});
        const hook = setup();
        await waitFor(() => expect(hook.result.current.modalCase?.type).toBe("jump"));
        expect(hook.percentage).not.toHaveBeenCalled();
        expect(hook.enabled.current).toBe(false);
        act(() => hook.result.current.closePositionPrompt());
        expect(hook.enabled.current).toBe(true);
    });
    it("surfaces API errors, keeps saves paused, and allows retry", async () => {
        cross.mockRejectedValueOnce(new Error("offline"));
        const hook = setup();
        await waitFor(() => expect(hook.result.current.positionError).toContain("paused"));
        expect(hook.enabled.current).toBe(false);
        act(() => hook.result.current.retryPosition());
        await waitFor(() => expect(hook.result.current.modalCase?.type).toBe("approximate"));
        expect(hook.result.current.positionError).toBe("");
    });
});
