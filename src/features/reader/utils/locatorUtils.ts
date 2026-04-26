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
    const chapter =
        locator.title ??
        locator.href?.split("/").pop()?.replace(/\.\w+$/, "") ??
        "Chapter";
    const progress = locator.locations?.totalProgression;
    return progress !== undefined
        ? `${chapter} (${Math.round(progress * 100)}%)`
        : chapter;
}
