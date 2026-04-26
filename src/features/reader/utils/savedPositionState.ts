import type {BookFormatType} from "@/entities/book/model/bookFormats";
import {Locator} from "@readium/shared";
import type {SavedPosition} from "../types/SavedPosition";

type SavedPositionEnvelope = {
    kind: "multi-format";
    activeFormat: BookFormatType;
    formats: Partial<Record<BookFormatType, string>>;
};

function getCurrentUserId(): string | null {
    if (typeof window === "undefined") return null;
    return sessionStorage.getItem("user_id");
}

function getCurrentlyReadingKey(): string | null {
    const userId = getCurrentUserId();
    return userId ? `currentlyReading_${userId}` : null;
}

function parseEnvelope(raw: string): SavedPositionEnvelope | null {
    try {
        const parsed = JSON.parse(raw) as Partial<SavedPositionEnvelope>;
        if (parsed.kind !== "multi-format" || !parsed.formats) {
            return null;
        }
        return {
            kind: "multi-format",
            activeFormat: parsed.activeFormat === "PDF" ? "PDF" : "EPUB",
            formats: parsed.formats,
        };
    } catch {
        return null;
    }
}

function detectLegacyFormat(raw: string): BookFormatType | undefined {
    if (!raw) return undefined;

    try {
        const parsed = JSON.parse(raw) as { kind?: string; href?: string; locations?: unknown };
        if (parsed.kind === "pdf") return "PDF";
        if (parsed.href || parsed.locations) return "EPUB";
    } catch {
        if (raw.startsWith("epubcfi(")) return "EPUB";
    }

    return undefined;
}

function toEnvelope(raw?: string | null): SavedPositionEnvelope | null {
    if (!raw) return null;

    const parsedEnvelope = parseEnvelope(raw);
    if (parsedEnvelope) return parsedEnvelope;

    const legacyFormat = detectLegacyFormat(raw);
    if (!legacyFormat) return null;

    return {
        kind: "multi-format",
        activeFormat: legacyFormat,
        formats: {
            [legacyFormat]: raw,
        },
    };
}

export function getExactFormatPosition(raw: string | null | undefined, format: BookFormatType): string | undefined {
    const envelope = toEnvelope(raw);
    if (envelope) {
        return envelope.formats[format];
    }

    const legacyFormat = raw ? detectLegacyFormat(raw) : undefined;
    return legacyFormat === format ? raw ?? undefined : undefined;
}

export function getActiveFormatPosition(raw: string | null | undefined): BookFormatType | undefined {
    const envelope = toEnvelope(raw);
    if (envelope) {
        return envelope.activeFormat;
    }
    return raw ? detectLegacyFormat(raw) : undefined;
}

export function getResumeFormatPosition(raw: string | null | undefined, format: BookFormatType): string | undefined {
    const envelope = toEnvelope(raw);
    if (envelope) {
        return envelope.activeFormat === format ? envelope.formats[format] : undefined;
    }

    const legacyFormat = raw ? detectLegacyFormat(raw) : undefined;
    return legacyFormat === format ? raw ?? undefined : undefined;
}

export function buildSerializedPosition(
    existingRaw: string | null | undefined,
    format: BookFormatType,
    exactPosition: string,
): string {
    const envelope = toEnvelope(existingRaw) ?? {
        kind: "multi-format" as const,
        activeFormat: format,
        formats: {},
    };

    return JSON.stringify({
        kind: "multi-format",
        activeFormat: format,
        formats: {
            ...envelope.formats,
            [format]: exactPosition,
        },
    });
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

export function getStoredSerializedPosition(bookId: string): string | undefined {
    const map = readCurrentlyReadingMap();
    const value = map[bookId];
    return typeof value === "string" ? value : undefined;
}

export function saveStoredFormatPosition(bookId: string, format: BookFormatType, exactPosition: string): string {
    const map = readCurrentlyReadingMap();
    const serialized = buildSerializedPosition(map[bookId], format, exactPosition);
    map[bookId] = serialized;
    writeCurrentlyReadingMap(map);
    return serialized;
}

export function clearStoredBookPosition(bookId: string): void {
    const key = getCurrentlyReadingKey();
    if (!key || typeof localStorage === "undefined") return;

    const map = readCurrentlyReadingMap();
    delete map[bookId];
    if (Object.keys(map).length === 0) {
        localStorage.removeItem(key);
        return;
    }
    writeCurrentlyReadingMap(map);
}

export function getStoredLocator(bookId: string, onlyIfActive = true): Locator | null {
    const serialized = getStoredSerializedPosition(bookId);
    const stored = onlyIfActive
        ? getResumeFormatPosition(serialized, "EPUB")
        : getExactFormatPosition(serialized, "EPUB");
    if (!stored) return null;

    try {
        return Locator.deserialize(JSON.parse(stored)) ?? null;
    } catch {
        return null;
    }
}

export function getStoredPdfPage(bookId: string, onlyIfActive = true): number | undefined {
    const serialized = getStoredSerializedPosition(bookId);
    const stored = onlyIfActive
        ? getResumeFormatPosition(serialized, "PDF")
        : getExactFormatPosition(serialized, "PDF");
    if (!stored) return undefined;

    const numericPosition = Number(stored);
    if (Number.isInteger(numericPosition) && numericPosition > 0) {
        return numericPosition;
    }

    try {
        const parsed = JSON.parse(stored) as {kind?: string; page?: number};
        if (parsed.kind === "pdf" && Number.isInteger(parsed.page)) {
            const page = parsed.page;
            if (typeof page === "number" && page > 0) {
                return page;
            }
        }
    } catch {
        return undefined;
    }

    return undefined;
}

export function getApproximateLocator(
    positions: Locator[],
    savedPosition: SavedPosition | null,
): Locator | undefined {
    const percentage = savedPosition?.percentage;
    if (percentage === undefined || percentage === null || positions.length === 0) return undefined;

    const clamped = Math.min(Math.max(percentage, 0), 1);
    const exact = positions.find((position) => {
        const progression = position.locations?.totalProgression;
        return progression !== undefined && Math.abs(progression - clamped) < 0.001;
    });
    if (exact) return exact;

    let best = positions[0];
    let smallestDistance = Number.POSITIVE_INFINITY;
    for (const position of positions) {
        const progression = position.locations?.totalProgression;
        if (progression === undefined) continue;
        const distance = Math.abs(progression - clamped);
        if (distance < smallestDistance) {
            smallestDistance = distance;
            best = position;
        }
    }
    return best;
}

export function getApproximatePdfPage(savedPosition: SavedPosition | null, numPages: number): number | undefined {
    const percentage = savedPosition?.percentage;
    if (percentage === undefined || percentage === null || numPages <= 0) return undefined;

    const clamped = Math.min(Math.max(percentage, 0), 1);
    return Math.min(numPages, Math.max(1, Math.round(clamped * (numPages - 1)) + 1));
}
