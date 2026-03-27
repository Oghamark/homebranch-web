import { useEffect } from "react";
import type { RefObject } from "react";
import type { EpubNavigator } from "@readium/navigator";

export function useKeyboardNavigation(navigatorRef: RefObject<EpubNavigator | null>) {
    useEffect(() => {
        function handleKey(e: KeyboardEvent) {
            const nav = navigatorRef.current;
            if (!nav) return;
            if (e.key === "ArrowRight" || e.key === "ArrowDown") nav.goForward(false, () => {});
            else if (e.key === "ArrowLeft" || e.key === "ArrowUp") nav.goBackward(false, () => {});
        }
        document.addEventListener("keydown", handleKey);
        return () => document.removeEventListener("keydown", handleKey);
    }, [navigatorRef]);
}
