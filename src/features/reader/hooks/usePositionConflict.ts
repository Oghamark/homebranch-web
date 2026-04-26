import { useCallback, useEffect, useState } from "react";
import type { RefObject } from "react";
import { Locator } from "@readium/shared";
import type { EpubNavigator } from "@readium/navigator";
import { getSavedPosition, savePosition } from "../api/savedPositionApi";
import type { SavedPosition } from "../types/SavedPosition";
import type { ModalCase } from "../components/JumpToSavedPositionModal";
import { getInitialLocator, isCfi, formatLocatorLabel } from "../utils/locatorUtils";
import ToastFactory from "@/shared/lib/toast/toast";
import {getResumeFormatPosition} from "../utils/savedPositionState";

function buildConflictModal(
    serverPos: SavedPosition,
    localLocator: Locator | null,
    deviceName: string,
): ModalCase | null {
    const exactServerPosition = getResumeFormatPosition(serverPos.position, "EPUB");
    if (!exactServerPosition || isCfi(exactServerPosition)) return null;

    let serverLocator: Locator | undefined;
    try {
        serverLocator = Locator.deserialize(JSON.parse(exactServerPosition));
    } catch {
        return null;
    }
    if (!serverLocator) return null;

    if (localLocator && JSON.stringify(localLocator.serialize()) === exactServerPosition) return null;

    const serverLabel = formatLocatorLabel(serverLocator);

    if (localLocator && serverPos.deviceName === deviceName) {
        return {
            type: "conflict",
            serverPosition: exactServerPosition,
            localPosition: JSON.stringify(localLocator.serialize()),
            serverLabel,
            localLabel: formatLocatorLabel(localLocator),
        };
    }

    return {
        type: "jump",
        deviceName: serverPos.deviceName,
        updatedAt: serverPos.updatedAt,
        serverPosition: exactServerPosition,
        serverLabel,
    };
}

export function usePositionConflict(
    bookId: string,
    navigatorRef: RefObject<EpubNavigator | null>,
    deviceName: string,
    isLoaded: boolean,
    onLocationChange: (loc: string, percentage?: number) => void,
    saveImmediate: (loc: string, percentage?: number) => Promise<void>,
) {
    const [modalCase, setModalCase] = useState<ModalCase | null>(null);

    useEffect(() => {
        if (!isLoaded) return;

        let cancelled = false;

        async function check() {
            try {
                const serverPos = await getSavedPosition(bookId);
                if (cancelled || !serverPos) return;

                const localLocator = getInitialLocator(bookId, true);
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
        (position: string) => {
            const nav = navigatorRef.current;
            if (nav) {
                try {
                    const locator = Locator.deserialize(JSON.parse(position));
                    if (locator) nav.go(locator, true, () => {});
                } catch {
                    // ignore malformed position
                }
            }
            const locator = Locator.deserialize(JSON.parse(position));
            onLocationChange(position, locator?.locations?.totalProgression);
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
                JSON.stringify(nav.currentLocator.serialize()),
                nav.currentLocator.locations?.totalProgression,
            );
        } catch {
            ToastFactory({ message: "Failed to sync local position to cloud", type: "warning" });
        }
    }, [navigatorRef, saveImmediate]);

    return { modalCase, setModalCase, handleJump, handleKeepLocal };
}
