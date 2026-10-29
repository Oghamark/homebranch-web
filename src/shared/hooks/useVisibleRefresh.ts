import {useSyncExternalStore} from "react";

const subscribe = (listener: () => void) => {
    document.addEventListener("visibilitychange", listener);
    return () => document.removeEventListener("visibilitychange", listener);
};
const visible = () => document.visibilityState !== "hidden";

export function useVisibleRefresh() {
    const active = useSyncExternalStore(subscribe, visible, () => true);
    // Explicitly stop the timer rather than relying on a previously scheduled focus check.
    return {pollingInterval: active ? 30_000 : 0, skipPollingIfUnfocused: true, refetchOnFocus: true, refetchOnReconnect: true};
}
