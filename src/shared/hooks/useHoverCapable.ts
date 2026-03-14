import {useState, useEffect} from "react";

/**
 * Returns true if the current device supports hover (e.g. mouse/trackpad).
 * Returns false on touch-only devices where hover is unavailable.
 * Reacts to changes so hybrid devices (e.g. tablet + keyboard) update correctly.
 */
export function useHoverCapable(): boolean {
    const [hoverCapable, setHoverCapable] = useState(
        () => window.matchMedia("(hover: hover)").matches
    );

    useEffect(() => {
        const mq = window.matchMedia("(hover: hover)");
        const handler = (e: MediaQueryListEvent) => setHoverCapable(e.matches);
        mq.addEventListener("change", handler);
        return () => mq.removeEventListener("change", handler);
    }, []);

    return hoverCapable;
}
