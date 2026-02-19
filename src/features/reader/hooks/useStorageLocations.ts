import {useEffect, useState} from "react";
import {getAllSavedPositions} from "../api/savedPositionApi";
import type {StorageLocation} from "../components/StorageIndicator";

interface StorageLocationsResult {
    locations: Record<string, StorageLocation>;
    allBookIds: string[];
}

export function useStorageLocations(localBookIds: string[]): StorageLocationsResult {
    const [result, setResult] = useState<StorageLocationsResult>({
        locations: {},
        allBookIds: localBookIds,
    });

    useEffect(() => {
        let cancelled = false;

        async function fetch() {
            const localSet = new Set(localBookIds);
            const locations: Record<string, StorageLocation> = {};
            const allIds = new Set(localBookIds);

            try {
                const cloudPositions = await getAllSavedPositions();
                const cloudSet = new Set(cloudPositions.map((p) => p.bookId));

                for (const id of localBookIds) {
                    locations[id] = cloudSet.has(id) ? "both" : "local";
                }

                for (const pos of cloudPositions) {
                    if (!localSet.has(pos.bookId)) {
                        locations[pos.bookId] = "cloud";
                        allIds.add(pos.bookId);
                    }
                }
            } catch {
                for (const id of localBookIds) {
                    locations[id] = "local";
                }
            }

            if (!cancelled) {
                setResult({
                    locations,
                    allBookIds: Array.from(allIds),
                });
            }
        }

        fetch();
        return () => { cancelled = true; };
    }, [localBookIds.join(",")]);

    return result;
}
