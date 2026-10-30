import {act, renderHook, waitFor} from "@testing-library/react";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {Locator, LocatorLocations} from "@readium/shared";
import type {EpubNavigator} from "@readium/navigator";
import {getSavedPosition} from "../api/savedPositionApi";
import {getCrossReaderProgress} from "@/features/koreader/api";
import {usePositionConflict} from "./usePositionConflict";
import {installMemoryStorage} from "@/test/memoryStorage";
import {storePositionSyncState} from "../utils/savedPositionState";
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
function setup(options?: {portable?: (location: any) => Promise<{locator: Locator; label: string; precision?: "passage"} | null>; hold?: {current: boolean}; failJump?: boolean}) {
    const enabled = {current: false};
    const go = vi.fn((_loc, _animated, callback) => callback(!options?.failJump));
    const nav = {current: {go, currentLocator: locator} as unknown as EpubNavigator};
    const change = vi.fn(), immediate = vi.fn(async () => {});
    const resolve = (position: Locator) => position;
    const percentage = vi.fn(() => locator);
    const hook = renderHook(() => usePositionConflict("book", nav, "Browser", true, change, immediate, resolve, {current: "http://localhost/epub/"}, enabled, percentage, options?.portable, options?.hold));
    return {...hook, enabled, go, change, percentage};
}
describe("startup cross-reader position choice", () => {
    it("offers a verified passage without describing placement as a percentage estimate", async () => {
        cross.mockResolvedValue({...remote, location: {version: 1, formatId: "format", contentHash: "hash",
            mapFingerprint: "map", href: "two.xhtml", resourceProgression: 0.1, basis: "rendered",
            passage: {version: 1, exact: "the verified passage"}}});
        const hook = setup({portable: async () => ({locator, label: "Verified saved passage", precision: "passage"})});
        await waitFor(() => expect(hook.result.current.modalCase?.type).toBe("passage"));
        expect(hook.percentage).not.toHaveBeenCalled();
        await act(async () => {await hook.result.current.handleJump(locator);});
        expect(hook.go).toHaveBeenCalledWith(locator, true, expect.any(Function));
    });
    it("pauses saves until explicitly accepting the approximate jump", async () => {
        const hook = setup();
        expect(hook.enabled.current).toBe(false);
        await waitFor(() => expect(hook.result.current.modalCase?.type).toBe("approximate"));
        expect(hook.enabled.current).toBe(false);
        expect(hook.percentage).toHaveBeenCalledWith(0.6);
        await act(async () => { await hook.result.current.handleJump(locator); });
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
    it("uses shared revisions despite clock skew, warns about pending local work, and holds generated restore saves", async () => {
        storePositionSyncState("book", {revision: "1", pending: true});
        localStorage.setItem("reader_position_time_account_book", String(Date.parse("2099-01-01T00:00:00Z")));
        cross.mockResolvedValue({...remote, location: {version: 1, formatId: "format", contentHash: "hash", mapFingerprint: "map", href: "two.xhtml", resourceProgression: 0.2, chapterId: "two.xhtml#part", chapterProgression: 0.5, basis: "text"}});
        const hold = {current: false};
        const portable = vi.fn(async () => ({locator, label: "Verified chapter, approximately 50% through chapter"}));
        const hook = setup({portable, hold});
        await waitFor(() => expect(hook.result.current.modalCase?.type).toBe("portable"));
        expect(hook.percentage).not.toHaveBeenCalled();
        expect(hook.result.current.modalCase).toMatchObject({localWork: true});
        await act(async () => { await hook.result.current.handleJump(locator); });
        expect(hold.current).toBe(true);
        expect(hook.enabled.current).toBe(false);
    });
    it("keeps saves paused and shows a restore failure instead of dismissing the choice", async () => {
        const hook = setup({failJump: true});
        await waitFor(() => expect(hook.result.current.modalCase?.type).toBe("approximate"));
        await act(async () => { await hook.result.current.handleJump(locator); });
        expect(hook.enabled.current).toBe(false);
        expect(hook.result.current.positionError).toContain("Unable to jump");
        expect(hook.result.current.modalCase).not.toBeNull();
    });
    it("does not turn invalid portable coordinates into a successful whole-book jump", async () => {
        cross.mockResolvedValue({...remote, location: {} as any});
        const hook = setup({portable: async () => { throw new Error("Invalid saved chapter coordinates"); }});
        await waitFor(() => expect(hook.result.current.positionError).toContain("No guessed jump"));
        expect(hook.enabled.current).toBe(false);
        expect(hook.percentage).not.toHaveBeenCalled();
    });
    it("labels an unavailable or stale chapter map as whole-book fallback", async () => {
        cross.mockResolvedValue({...remote, location: {} as any});
        const hook = setup({portable: async () => null});
        await waitFor(() => expect(hook.result.current.modalCase?.type).toBe("approximate"));
        expect(hook.result.current.modalCase?.serverLabel).toContain("Chapter map unavailable or changed");
        expect(hook.enabled.current).toBe(false);
    });
});
