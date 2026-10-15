import {act, renderHook, waitFor} from "@testing-library/react";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {useStorageLocations} from "./useStorageLocations";
import {getAllSavedPositions} from "../api/savedPositionApi";

vi.mock("../api/savedPositionApi", () => ({getAllSavedPositions: vi.fn()}));
const discover = vi.mocked(getAllSavedPositions);

beforeEach(() => {discover.mockReset();});

describe("reading progress discovery", () => {
    it("reports failure without dropping local books and retries the unchanged local/cloud merge", async () => {
        discover.mockRejectedValueOnce(new Error("Unavailable"));
        discover.mockResolvedValueOnce([{bookId: "local-book"}, {bookId: "cloud-book"}] as Awaited<ReturnType<typeof getAllSavedPositions>>);
        const {result} = renderHook(() => useStorageLocations(["local-book"]));
        expect(result.current.isLoading).toBe(true);
        await waitFor(() => expect(result.current.discoveryError).toBe(true));
        expect(result.current.isLoading).toBe(false);
        expect(result.current.allBookIds).toEqual(["local-book"]);
        expect(result.current.locations).toEqual({"local-book": "local"});

        act(() => result.current.retry());
        await waitFor(() => expect(result.current.allBookIds).toEqual(["local-book", "cloud-book"]));
        expect(result.current.discoveryError).toBe(false);
        expect(result.current.isLoading).toBe(false);
        expect(result.current.locations).toEqual({"local-book": "both", "cloud-book": "cloud"});
        expect(discover).toHaveBeenCalledTimes(2);
    });

    it("does not represent failed discovery as a successfully empty collection", async () => {
        discover.mockRejectedValue(new Error("Unavailable"));
        const {result} = renderHook(() => useStorageLocations([]));
        await waitFor(() => expect(result.current.discoveryError).toBe(true));
        expect(result.current.allBookIds).toEqual([]);
        expect(result.current.isLoading).toBe(false);
    });
});
