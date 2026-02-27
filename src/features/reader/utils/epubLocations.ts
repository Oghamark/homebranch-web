import type { Book } from "epubjs";

const LOCATIONS_KEY_PREFIX = "epubLocations";

function getLocationsKey(bookId: string): string {
    return `${LOCATIONS_KEY_PREFIX}_${bookId}`;
}

interface LocationEntry {
    ts: number;
    data: string;
}

function parseEntry(raw: string): LocationEntry | null {
    try {
        const parsed = JSON.parse(raw);
        if (typeof parsed?.ts === "number" && typeof parsed?.data === "string") {
            return parsed as LocationEntry;
        }
        return null;
    } catch {
        return null;
    }
}

function getAllLocationKeys(): string[] {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(LOCATIONS_KEY_PREFIX + "_")) keys.push(key);
    }
    return keys;
}

function evictOldestEntry(): boolean {
    const keys = getAllLocationKeys();
    if (keys.length === 0) return false;

    let oldestKey = keys[0];
    let oldestTs = Infinity;

    for (const key of keys) {
        const raw = localStorage.getItem(key);
        if (!raw) { oldestKey = key; break; }
        const entry = parseEntry(raw);
        const ts = entry?.ts ?? 0;
        if (ts < oldestTs) {
            oldestTs = ts;
            oldestKey = key;
        }
    }

    localStorage.removeItem(oldestKey);
    return true;
}

function saveWithEviction(key: string, entry: LocationEntry): void {
    const value = JSON.stringify(entry);
    for (let attempts = 0; attempts < 20; attempts++) {
        try {
            localStorage.setItem(key, value);
            return;
        } catch {
            if (!evictOldestEntry()) return;
        }
    }
}

/**
 * Returns locations for the book, loading from localStorage cache when available
 * and falling back to generation (which is then cached for future opens).
 */
export async function getOrGenerateLocations(book: Book, bookId: string): Promise<void> {
    const key = getLocationsKey(bookId);
    const raw = localStorage.getItem(key);

    if (raw) {
        const entry = parseEntry(raw);
        if (entry) {
            try {
                book.locations.load(entry.data);
                return;
            } catch {
                // Corrupted data — fall through to regenerate
            }
        }
        localStorage.removeItem(key);
    }

    await book.locations.generate(1600);

    const serialized = book.locations.save();
    saveWithEviction(key, { ts: Date.now(), data: serialized });
}

export function clearLocationsCache(bookId: string): void {
    localStorage.removeItem(getLocationsKey(bookId));
}

export function cleanupStaleLocationCaches(validBookIds: string[]): void {
    const validSet = new Set(validBookIds);
    const stale = getAllLocationKeys().filter(key => {
        const bookId = key.slice(LOCATIONS_KEY_PREFIX.length + 1);
        return !validSet.has(bookId);
    });
    for (const key of stale) {
        localStorage.removeItem(key);
    }
}
