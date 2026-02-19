import {useCallback, useEffect, useRef} from "react";
import {savePosition} from "../api/savedPositionApi";
import ToastFactory from "@/app/utils/toast_handler";

export function useSavePositionSync(bookId: string, deviceName: string) {
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const failedRef = useRef(false);

    useEffect(() => {
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, []);

    const onLocationChange = useCallback(
        (location: string | number) => {
            const currentlyReading = JSON.parse(
                localStorage.getItem("currentlyReading") ?? "{}",
            );
            currentlyReading[bookId] = location;
            localStorage.setItem("currentlyReading", JSON.stringify(currentlyReading));

            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(async () => {
                try {
                    await savePosition(bookId, String(location), deviceName);
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
        [bookId, deviceName],
    );

    return {onLocationChange};
}
