import {useSyncExternalStore} from "react";
import {notificationRefresh} from "@/entities/social/api";

const subscribe = (listener: () => void) => {
    document.addEventListener("visibilitychange", listener);
    return () => document.removeEventListener("visibilitychange", listener);
};
const visible = () => document.visibilityState !== "hidden";

export function useNotificationRefresh() {
    const active = useSyncExternalStore(subscribe, visible, () => true);
    // Explicitly stop the timer rather than relying on a previously scheduled focus check.
    return {...notificationRefresh, pollingInterval: active ? notificationRefresh.pollingInterval : 0};
}
