import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { Locator } from "@readium/shared";
import type { EpubNavigator } from "@readium/navigator";
import { getSavedPosition } from "../api/savedPositionApi";
import type { SavedPosition } from "../types/SavedPosition";
import type { ModalCase } from "../components/JumpToSavedPositionModal";
import {formatLocatorLabel, deserializeLocatorFromCloud, isSamePosition} from "../utils/locatorUtils";
import {getStoredLocator} from "../utils/savedPositionState";
import ToastFactory from "@/shared/lib/toast/toast";
import {getCrossReaderProgress} from "@/features/koreader/api";
import {getStoredPositionTime} from "../utils/savedPositionState";

function buildConflictModal(
    serverPos: SavedPosition,
    localLocator: Locator | null,
    deviceName: string,
    resourceBase?: string,
): ModalCase | null {
    let serverLocator: Locator | undefined;
    try {
        serverLocator = deserializeLocatorFromCloud(serverPos?.position, resourceBase);
    } catch {
        return null;
    }
    if (!serverLocator) return null;

    if (localLocator && isSamePosition(localLocator, serverLocator, resourceBase)) return null;

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
    resolveStoredLocator: (stored: Locator) => Locator,
    resourceBaseRef?: RefObject<string | undefined>,
    savesEnabledRef?: RefObject<boolean>,
    resolvePercentage?: (percentage: number) => Locator | null,
) {
    const [modalCase, setModalCase] = useState<ModalCase | null>(null);
    const [positionError, setPositionError] = useState("");
    const [attempt, setAttempt] = useState(0);
    const resolvePercentageRef = useRef(resolvePercentage);
    resolvePercentageRef.current = resolvePercentage;

    useEffect(() => {
        if (!isLoaded) return;

        let cancelled = false;
        if (savesEnabledRef) savesEnabledRef.current = false;

        async function check() {
            try {
                setPositionError("");
                const [serverPos, cross] = await Promise.all([getSavedPosition(bookId), getCrossReaderProgress(bookId)]);
                if (cancelled) return;
                const localLocator = getStoredLocator(bookId);
                const localTime = getStoredPositionTime(bookId);
                const acceptedTime = cross ? Date.parse(cross.updatedAt) : NaN;
                const serverTime = serverPos ? Date.parse(serverPos.updatedAt) : 0;
                const crossIsNewer = cross?.source === "koreader"
                    && Number.isFinite(acceptedTime)
                    && acceptedTime >= serverTime
                    && (!localTime || acceptedTime > localTime);
                const approximate = crossIsNewer ? resolvePercentageRef.current?.(cross.percentage) : null;
                const mc: ModalCase | null = approximate && cross
                    ? {type: "approximate", deviceName: cross.device, serverPosition: approximate, serverLabel: `Approximately ${Math.round(cross.percentage * 100)}%`}
                    : serverPos ? buildConflictModal(serverPos, localLocator, deviceName, resourceBaseRef?.current) : null;
                if (mc) setModalCase(mc);
                else if (savesEnabledRef) savesEnabledRef.current = true;
            } catch {
                if (!cancelled) setPositionError("Unable to check saved positions. Automatic position saves are paused until you retry or choose to stay here.");
            }
        }

        check();
        return () => {
            cancelled = true;
        };
    }, [bookId, deviceName, isLoaded, attempt, savesEnabledRef]);

    const closePositionPrompt = useCallback(() => {
        setModalCase(null); setPositionError("");
        if (savesEnabledRef) savesEnabledRef.current = true;
    }, [savesEnabledRef]);

    const handleJump = useCallback(
        (locator: Locator) => {
            const nav = navigatorRef.current;
            // Resolve the stored locator to a valid web locator before navigating.
            // Cross-platform positions (e.g. from Android) may have hrefs or position
            // numbers incompatible with this client's reading order.
            const resolved = resolveStoredLocator(locator);
            if (nav) {
                nav.go(resolved, true, (ok) => {
                    if (!ok) {
                        setPositionError("Unable to jump to the saved position. Retry or choose to stay here.");
                        return;
                    }
                    closePositionPrompt();
                    onLocationChange(resolved, resolved?.locations?.totalProgression);
                });
            }
        },
        [navigatorRef, onLocationChange, resolveStoredLocator, closePositionPrompt],
    );

    const handleKeepLocal = useCallback(async () => {
        closePositionPrompt();
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
    }, [navigatorRef, saveImmediate, closePositionPrompt]);

    return { modalCase, setModalCase, handleJump, handleKeepLocal, closePositionPrompt, positionError, retryPosition: () => setAttempt(value => value + 1) };
}
