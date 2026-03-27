import { Locator } from "@readium/shared";

export function isCfi(position: string): boolean {
    return position.startsWith("epubcfi(");
}

export function getInitialLocator(bookId: string): Locator | null {
    if (typeof window === "undefined") return null;
    try {
        const map: Record<string, unknown> = JSON.parse(
            localStorage.getItem(`currentlyReading_${sessionStorage.getItem("user_id")}`) ?? "{}",
        );
        const stored = map[bookId];
        if (!stored || isCfi(String(stored))) return null;
        return Locator.deserialize(JSON.parse(String(stored))) ?? null;
    } catch {
        return null;
    }
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
