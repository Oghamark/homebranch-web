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
import {getPositionSyncState, saveLocatorLocal, storePositionSyncState} from "../utils/savedPositionState";
import type {PortableLocation} from "../types/PortableLocation";

function revision(value?: string | null): bigint | null {
    try { return value && /^\d+$/.test(value) ? BigInt(value) : null; } catch { return null; }
}

function buildConflictModal(
    serverPos: SavedPosition,
    localLocator: Locator | null,
    deviceName: string,
    resourceBase?: string,
    portable?: {locator: Locator; label: string} | null,
): ModalCase | null {
    let serverLocator: Locator | undefined;
    try {
        serverLocator = deserializeLocatorFromCloud(serverPos?.position, resourceBase);
    } catch {
        serverLocator = undefined;
    }
    serverLocator ??= portable?.locator;
    if (!serverLocator && serverPos.location) throw new Error("Saved chapter and web position cannot be resolved");
    if (!serverLocator) return null;
    if (portable && !serverLocator.text?.highlight) serverLocator = portable.locator;

    if (localLocator && isSamePosition(localLocator, serverLocator, resourceBase)) return null;

    const serverLabel = portable?.label ?? formatLocatorLabel(serverLocator);

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
    resolvePortable?: (location: PortableLocation) => Promise<{locator: Locator; label: string; precision?: "passage"} | null>,
    restoreHoldRef?: RefObject<boolean>,
    validateStoredLocator?: (stored: Locator) => Promise<Locator | null>,
) {
    const [modalCase, setModalCase] = useState<ModalCase | null>(null);
    const [positionError, setPositionError] = useState("");
    const [attempt, setAttempt] = useState(0);
    const resolvePercentageRef = useRef(resolvePercentage);
    resolvePercentageRef.current = resolvePercentage;
    const resolvePortableRef = useRef(resolvePortable);
    resolvePortableRef.current = resolvePortable;
    const offeredRevisionRef = useRef<string | undefined>(undefined);
    const offeredLocationRef = useRef<PortableLocation | undefined>(undefined);
    const decisionRef = useRef(0);

    useEffect(() => {
        if (!isLoaded) return;

        let cancelled = false;
        if (savesEnabledRef) savesEnabledRef.current = false;
        if (restoreHoldRef) restoreHoldRef.current = false;

        async function check() {
            try {
                setPositionError("");
                const [serverPos, cross] = await Promise.all([getSavedPosition(bookId), getCrossReaderProgress(bookId)]);
                if (cancelled) return;
                const localLocator = getStoredLocator(bookId);
                const localTime = getStoredPositionTime(bookId);
                const localState = getPositionSyncState(bookId);
                const acceptedTime = cross ? Date.parse(cross.updatedAt) : NaN;
                const serverTime = serverPos ? Date.parse(serverPos.updatedAt) : 0;
                const remoteRevision = revision(cross?.revision);
                const webRevision = revision(serverPos?.revision);
                const localRevision = revision(localState.revision);
                const crossIsNewer = cross?.source === "koreader" && (remoteRevision !== null && (webRevision !== null || localRevision !== null)
                    ? (webRevision === null || remoteRevision > webRevision) && (localRevision === null || remoteRevision > localRevision)
                    : Number.isFinite(acceptedTime) && acceptedTime >= serverTime && (!localTime || acceptedTime > localTime));
                const portable = crossIsNewer && cross?.location ? await resolvePortableRef.current?.(cross.location) : null;
                const webPortable = !crossIsNewer && serverPos?.location ? await resolvePortableRef.current?.(serverPos.location) : null;
                if (cancelled) return;
                const approximate = crossIsNewer && !portable ? resolvePercentageRef.current?.(cross!.percentage) : null;
                const target = portable?.locator ?? approximate;
                if (crossIsNewer && !target) {
                    setPositionError("No compatible saved coordinate is available. Automatic position saves are paused until you retry or choose to stay here.");
                    return;
                }
                const serverEligible = serverPos && (webRevision === null || localRevision === null || webRevision > localRevision || localState.pending);
                const mc: ModalCase | null = target && cross
                    ? {type: portable?.precision === "passage" ? "passage" : portable ? "portable" : "approximate", deviceName: cross.device, serverPosition: target,
                        serverLabel: portable?.label ?? `${cross.location ? "Chapter map unavailable or changed. " : ""}Approximately ${Math.round(cross.percentage * 100)}% of the whole book`,
                        ...(localState.pending ? {localWork: true} : {})}
                    : serverEligible ? buildConflictModal(serverPos, localLocator, deviceName, resourceBaseRef?.current, webPortable) : null;
                offeredRevisionRef.current = (crossIsNewer ? cross?.revision : serverPos?.revision) ?? undefined;
                offeredLocationRef.current = (crossIsNewer ? cross?.location : serverPos?.location) ?? undefined;
                if (mc) setModalCase(mc);
                else if (localState.restored && restoreHoldRef) restoreHoldRef.current = true;
                else if (savesEnabledRef) savesEnabledRef.current = true;
            } catch (error) {
                if (!cancelled) setPositionError(`${error instanceof Error && /saved|chapter/i.test(error.message) ? error.message + ". No guessed jump was applied. " : "Unable to check saved positions. "}Automatic position saves are paused until you retry or choose to stay here.`);
            }
        }

        check();
        return () => {
            cancelled = true;
        };
    }, [bookId, deviceName, isLoaded, attempt, savesEnabledRef]);

    const closePositionPrompt = useCallback(() => {
        decisionRef.current++;
        setModalCase(null); setPositionError("");
        if (restoreHoldRef) restoreHoldRef.current = false;
        if (savesEnabledRef) savesEnabledRef.current = true;
    }, [savesEnabledRef, restoreHoldRef]);

    const handleJump = useCallback(
        async (locator: Locator) => {
            const nav = navigatorRef.current;
            const decision = decisionRef.current;
            // Resolve the stored locator to a valid web locator before navigating.
            // Cross-platform positions (e.g. from Android) may have hrefs or position
            // numbers incompatible with this client's reading order.
            const resolved = resolveStoredLocator(locator);
            try {
                if (validateStoredLocator && !await validateStoredLocator(resolved)) {
                    setPositionError("The saved passage cannot be verified in this EPUB. No guessed jump was applied. Retry or choose to stay here.");
                    return;
                }
            } catch {
                if (decision !== decisionRef.current) return;
                setPositionError("Unable to load the saved passage. Retry or choose to stay here.");
                return;
            }
            if (decision !== decisionRef.current) return;
            if (!nav) { setPositionError("The reader is not ready to restore this position. Retry or choose to stay here."); return; }
            if (nav) {
                try { nav.go(resolved, true, (ok) => {
                    if (decision !== decisionRef.current) return;
                    if (!ok) {
                        setPositionError("Unable to jump to the saved position. Retry or choose to stay here.");
                        return;
                    }
                    closePositionPrompt();
                    if (restoreHoldRef) {
                        restoreHoldRef.current = true;
                        if (savesEnabledRef) savesEnabledRef.current = false;
                    }
                    onLocationChange(resolved, resolved?.locations?.totalProgression);
                    saveLocatorLocal(bookId, resolved);
                    storePositionSyncState(bookId, {revision: offeredRevisionRef.current, pending: false,
                        location: offeredLocationRef.current, restored: !!restoreHoldRef});
                }); } catch {
                    setPositionError("Unable to jump to the saved position. Retry or choose to stay here.");
                }
            }
        },
        [navigatorRef, onLocationChange, resolveStoredLocator, closePositionPrompt, bookId, restoreHoldRef, savesEnabledRef, validateStoredLocator],
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
