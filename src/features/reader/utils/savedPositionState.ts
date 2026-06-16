import {Locator} from "@readium/shared";

function getCurrentUserId(): string | null {
    if (typeof window === "undefined") return null;
    return sessionStorage.getItem("user_id");
}

function getCurrentlyReadingKey(): string | null {
    const userId = getCurrentUserId();
    return userId ? `currentlyReading_${userId}` : null;
}

function readCurrentlyReadingMap(): Record<string, string> {
    const key = getCurrentlyReadingKey();
    if (!key || typeof localStorage === "undefined") return {};

    try {
        return JSON.parse(localStorage.getItem(key) ?? "{}") as Record<string, string>;
    } catch {
        return {};
    }
}

function writeCurrentlyReadingMap(map: Record<string, string>): void {
    const key = getCurrentlyReadingKey();
    if (!key || typeof localStorage === "undefined") return;
    localStorage.setItem(key, JSON.stringify(map));
}

export function saveLocatorLocal(bookId: string, locator: Locator): string {
    const map = readCurrentlyReadingMap();
    const serializedLocator = JSON.stringify(locator.serialize());
    map[bookId] = serializedLocator;
    writeCurrentlyReadingMap(map);
    return serializedLocator;
}
export function getStoredLocator(bookId: string): Locator | null {
    if (typeof window === "undefined") return null;
    const map = readCurrentlyReadingMap()
    if (!map) {
        return null;
    }

    const stored = map[bookId];
    if (!stored) return null;

    try {
        return Locator.deserialize(JSON.parse(stored)) ?? null;
    } catch {
        return null;
    }
}
