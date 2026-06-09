import { Locator } from "@readium/shared";
import {getStoredLocator} from "./savedPositionState";

export function isCfi(position: string): boolean {
    return position.startsWith("epubcfi(");
}

export function getInitialLocator(bookId: string, onlyIfActive = true): Locator | null {
    if (typeof window === "undefined") return null;
    return getStoredLocator(bookId, onlyIfActive);
}

export function formatLocatorLabel(locator: Locator): string {
    const title = locator.title?.trim();
    const href = locator.href?.split("#")[0];
    const hrefSegment = href?.split("/").pop();
    const hrefFallback = hrefSegment
        ?.replace(/\.\w+$/, "")
        ?.replace(/[_-]+/g, " ")
        ?.replace(/\s+/g, " ")
        ?.trim();
    const chapter = title || hrefFallback || "Chapter";
    const progress = locator.locations?.totalProgression;
    return progress !== undefined
        ? `${chapter} (${Math.round(progress * 100)}%)`
        : chapter;
}
