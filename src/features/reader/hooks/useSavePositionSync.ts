import {useCallback, useEffect, useRef} from "react";
import {savePosition} from "../api/savedPositionApi";
import ToastFactory from "@/shared/lib/toast/toast";
import type {BookFormatType} from "@/entities/book/model/bookFormats";
import {saveStoredFormatPosition} from "../utils/savedPositionState";

export function useSavePositionSync(bookId: string, format: BookFormatType, deviceName: string) {
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const failedRef = useRef(false);
    const lastSerializedRef = useRef<string | null>(null);

    useEffect(() => {
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, []);

    const onLocationChange = useCallback(
        (location: string | number, percentage?: number) => {
            const serialized = saveStoredFormatPosition(bookId, format, String(location));
            lastSerializedRef.current = serialized;

            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(async () => {
                try {
                    await savePosition(bookId, {position: serialized, deviceName, percentage});
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
        async (location: string | number, percentage?: number) => {
            const serialized = saveStoredFormatPosition(bookId, format, String(location));
            lastSerializedRef.current = serialized;
            await savePosition(bookId, {position: serialized, deviceName, percentage});
        },
        [bookId, deviceName, format],
    );

    return {onLocationChange, saveImmediate};
}
