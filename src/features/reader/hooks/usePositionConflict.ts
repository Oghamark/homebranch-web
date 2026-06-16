import { useCallback, useEffect, useState } from "react";
import type { RefObject } from "react";
import { Locator } from "@readium/shared";
import type { EpubNavigator } from "@readium/navigator";
import { getSavedPosition } from "../api/savedPositionApi";
import type { SavedPosition } from "@/features/reader";
import type { ModalCase } from "@/features/reader";
import { formatLocatorLabel, getStoredLocator } from "@/features/reader";
import { deserializeLocatorFromCloud } from "@/features/reader";
import ToastFactory from "@/shared/lib/toast/toast";

function buildConflictModal(
    serverPos: SavedPosition,
    localLocator: Locator | null,
    deviceName: string,
): ModalCase | null {
    let serverLocator: Locator | undefined;
    try {
        serverLocator = deserializeLocatorFromCloud(serverPos?.position);
    } catch {
        return null;
    }
    if (!serverLocator) return null;

    if (localLocator && JSON.stringify(localLocator.serialize()) === JSON.stringify(serverLocator.serialize())) return null;

    const serverLabel = formatLocatorLabel(serverLocator);

    if (localLocator && serverPos.deviceName === deviceName) {
        return {
            type: "conflict",
            serverPosition: serverLocator,
            localPosition: localLocator,
            serverLabel,
            localLabel: formatLocatorLabel(localLocator),
        };
    }

    return {
        type: "jump",
        deviceName: serverPos.deviceName,
        updatedAt: serverPos.updatedAt,
        serverPosition: serverLocator,
        serverLabel,
    };
}

export function usePositionConflict(
    bookId: string,
    navigatorRef: RefObject<EpubNavigator | null>,
    deviceName: string,
    isLoaded: boolean,
    onLocationChange: (locator: Locator, percentage?: number) => void,
    saveImmediate: (locator: Locator, percentage?: number) => Promise<void>,
) {
    const [modalCase, setModalCase] = useState<ModalCase | null>(null);

    useEffect(() => {
        if (!isLoaded) return;

        let cancelled = false;

        async function check() {
            try {
                const serverPos = await getSavedPosition(bookId);
                if (cancelled || !serverPos) return;

                const localLocator = getStoredLocator(bookId);
                const mc = buildConflictModal(serverPos, localLocator, deviceName);
                if (mc) setModalCase(mc);
            } catch {
                ToastFactory({ message: "Unable to check cloud position", type: "warning" });
            }
        }

        check();
        return () => {
            cancelled = true;
        };
    }, [bookId, deviceName, isLoaded]);

    const handleJump = useCallback(
        (locator: Locator) => {
            const nav = navigatorRef.current;
            if (nav) {
                nav.go(locator, true, () => {});
            }
            onLocationChange(locator, locator?.locations?.totalProgression);
            setModalCase(null);
        },
        [navigatorRef, onLocationChange],
    );

    const handleKeepLocal = useCallback(async () => {
        setModalCase(null);
        const nav = navigatorRef.current;
        if (!nav) return;
        try {
            await saveImmediate(
                nav.currentLocator,
                nav.currentLocator.locations?.totalProgression,
            );
        } catch {
            ToastFactory({ message: "Failed to sync local position to cloud", type: "warning" });
        }
    }, [navigatorRef, saveImmediate]);

    return { modalCase, setModalCase, handleJump, handleKeepLocal };
}
