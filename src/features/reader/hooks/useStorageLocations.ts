import {useCallback, useEffect, useState} from "react";
import {getReadingBookIds} from "../api/savedPositionApi";
import type {StorageLocation} from "../components/StorageIndicator";

interface StorageLocationsResult {
    locations: Record<string, StorageLocation>;
    allBookIds: string[];
    isLoading: boolean;
    discoveryError: boolean;
    retry: () => void;
}

export function useStorageLocations(localBookIds: string[]): StorageLocationsResult {
    const [result, setResult] = useState<Omit<StorageLocationsResult, "retry">>({
        locations: {},
        allBookIds: localBookIds,
        isLoading: true,
        discoveryError: false,
    });
    const [requestVersion, setRequestVersion] = useState(0);
    const retry = useCallback(() => setRequestVersion(version => version + 1), []);

    useEffect(() => {
        let cancelled = false;

        async function fetch() {
            setResult(previous => ({...previous, isLoading: true, discoveryError: false}));
            const localSet = new Set(localBookIds);
            const locations: Record<string, StorageLocation> = {};
            const allIds = new Set(localBookIds);
            let discoveryError = false;

            try {
                const cloudBookIds = await getReadingBookIds();
                const cloudSet = new Set(cloudBookIds);

                for (const id of localBookIds) {
                    locations[id] = cloudSet.has(id) ? "both" : "local";
                }

                for (const id of cloudBookIds) {
                    if (!localSet.has(id)) {
                        locations[id] = "cloud";
                        allIds.add(id);
                    }
                }
            } catch {
                discoveryError = true;
                for (const id of localBookIds) {
                    locations[id] = "local";
                }
            }

            if (!cancelled) {
                setResult({
                    locations,
                    allBookIds: Array.from(allIds),
                    isLoading: false,
                    discoveryError,
                });
            }
        }

        fetch();
        return () => { cancelled = true; };
    }, [localBookIds.join(","), requestVersion]);

    return {...result, retry};
}
