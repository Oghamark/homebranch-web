import {useCallback, useEffect, useRef} from "react";
import type {RefObject} from "react";
import {savePosition} from "../api/savedPositionApi";
import ToastFactory from "@/shared/lib/toast/toast";
import type {BookFormatType} from "@/entities/book/model/bookFormats";
import type {Locator} from "@readium/shared";
import {saveLocatorLocal} from "@/features/reader/utils/savedPositionState";
import {serializeLocatorForCloud} from "@/features/reader/utils/locatorUtils";
import {getPositionSyncState, storePositionSyncState} from "../utils/savedPositionState";
import type {PortableLocation} from "../types/PortableLocation";

export function useSavePositionSync(bookId: string, format: BookFormatType, deviceName: string, resourceBaseRef?: RefObject<string | undefined>, savesEnabledRef?: RefObject<boolean>, locationRef?: RefObject<PortableLocation | undefined>) {
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const failedRef = useRef(false);
    const sequenceRef = useRef(0);

    useEffect(() => {
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, []);

    const onLocationChange = useCallback(
        (locator: Locator, percentage?: number) => {
            if (savesEnabledRef && !savesEnabledRef.current) return;
            saveLocatorLocal(bookId, locator);
            const cloudSerialized = serializeLocatorForCloud(locator, resourceBaseRef?.current);
            const sequence = ++sequenceRef.current;
            const location = locationRef?.current;
            if (format === "EPUB") storePositionSyncState(bookId, {...getPositionSyncState(bookId), pending: true, location});

            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(async () => {
                if (savesEnabledRef && !savesEnabledRef.current) return;
                try {
                    const accepted = await savePosition(bookId, {position: cloudSerialized, deviceName, percentage, ...(location ? {location} : {})});
                    if (format === "EPUB" && sequenceRef.current === sequence) storePositionSyncState(bookId, {revision: accepted?.revision ?? undefined, pending: false, location});
                    if (failedRef.current) {
                        failedRef.current = false;
                        ToastFactory({message: "Position sync restored", type: "success"});
                    }
                } catch {
                    if (!failedRef.current) {
                        failedRef.current = true;
                        ToastFactory({message: "Unable to sync position. Reading offline.", type: "warning"});
                    }
                }
            }, 1000);
        },
        [bookId, deviceName, format],
    );

    const saveImmediate = useCallback(
        async (locator: Locator, percentage?: number) => {
            if (timerRef.current) clearTimeout(timerRef.current);
            const sequence = ++sequenceRef.current;
            saveLocatorLocal(bookId, locator);
            const cloudSerialized = serializeLocatorForCloud(locator, resourceBaseRef?.current);
            const location = locationRef?.current;
            if (format === "EPUB") storePositionSyncState(bookId, {...getPositionSyncState(bookId), pending: true, location});
            const accepted = await savePosition(bookId, {position: cloudSerialized, deviceName, percentage, ...(location ? {location} : {})});
            if (format === "EPUB" && sequenceRef.current === sequence) storePositionSyncState(bookId, {revision: accepted?.revision ?? undefined, pending: false, location});
        },
        [bookId, deviceName, format],
    );

    return {onLocationChange, saveImmediate};
}
