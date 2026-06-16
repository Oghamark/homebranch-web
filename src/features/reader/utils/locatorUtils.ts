import { Locator } from "@readium/shared";
import { config } from "@/shared";

/**
 * Strips the API base URL from a locator's href so it can be stored in the cloud
 * and restored correctly regardless of which URL the client uses to access the API.
 *
 * Also produces a minimal locator by retaining only cross-device-stable fields:
 * href, type, title, and within-chapter/book progression. Device-specific fields
 * like `position` (pagination index) and `fragments` (CFI / CSS selectors) are
 * dropped so they don't cause Readium to jump to the wrong spot on a different layout.
 */
export function serializeLocatorForCloud(locator: Locator): string {
    const minimal = locator.copyWithLocations({
        progression: locator.locations.progression,
        totalProgression: locator.locations.totalProgression,
    });
    const json = minimal.serialize() as Record<string, unknown>;
    delete json.text;
    if (typeof json.href === "string" && json.href.startsWith(config.apiUrl)) {
        json.href = json.href.slice(config.apiUrl.length);
    }
    return JSON.stringify(json);
}

/**
 * Deserializes a cloud-stored position string, re-attaching the current API base URL
 * to any relative href so the locator works with the Readium navigator.
 *
 * Also strips device-specific fields (position, fragments, text) so that positions
 * saved by older clients don't cause Readium to jump to the wrong spot.
 */
export function deserializeLocatorFromCloud(position: string): Locator | undefined {
    try {
        const json = JSON.parse(position) as Record<string, unknown>;
        if (typeof json.href === "string" && !json.href.startsWith("http")) {
            json.href = config.apiUrl + json.href;
        }
        const locator = Locator.deserialize(json);
        if (!locator) return undefined;
        return locator.copyWithLocations({
            progression: locator.locations.progression,
            totalProgression: locator.locations.totalProgression,
        });
    } catch {
        return undefined;
    }
}

export function isCfi(position: string): boolean {
    return position.startsWith("epubcfi(");
}

/**
 * Compares two locators using only cross-device-stable fields: href (normalized,
 * without the API base URL) and within-chapter progression. Used for conflict
 * detection so that device-specific fields like `position` don't cause false positives.
 */
export function isSamePosition(a: Locator, b: Locator, tolerance = 0.001): boolean {
    const normalize = (href: string) =>
        href.startsWith(config.apiUrl) ? href.slice(config.apiUrl.length) : href;

    if (normalize(a.href) !== normalize(b.href)) return false;

    const progA = a.locations.progression;
    const progB = b.locations.progression;

    if (progA === undefined && progB === undefined) return true;
    if (progA === undefined || progB === undefined) return false;

    return Math.abs(progA - progB) <= tolerance;
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
