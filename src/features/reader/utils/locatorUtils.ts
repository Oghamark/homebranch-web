import { Locator, LocatorLocations } from "@readium/shared";
import { config } from "@/shared";

/**
 * Strips the publication's resource base URL from a locator href, producing the
 * EPUB-internal path (e.g. "OEBPS/Text/chapter.html"). Falls back to stripping
 * just config.apiUrl if resourceBase is not available.
 *
 * Pagination indexes and unverified native fragments are never portable.
 * Supported Readium quote/selector evidence is retained separately from the
 * portable location, with engine provenance, for validated same-engine restores.
 */
export function serializeLocatorForCloud(locator: Locator, resourceBase?: string): string {
    const minimal = locator.type === "application/pdf"
        ? locator.copyWithLocations({progression: locator.locations.progression, totalProgression: locator.locations.totalProgression})
        : new Locator({href: locator.href, type: locator.type, title: locator.title,
            locations: new LocatorLocations({progression: locator.locations.progression, totalProgression: locator.locations.totalProgression})});
    const json = minimal.serialize() as Record<string, unknown>;
    if (locator.type !== "application/pdf" && locator.text?.highlight) {
        json.text = locator.text.serialize();
        json.readiumEngine = "readium-2";
        const selector = locator.locations.otherLocations?.get("cssSelector");
        if (typeof selector === "string") (json.locations as Record<string, unknown>).cssSelector = selector;
        const identity = locator.locations.otherLocations?.get("homebranchPublication");
        if (identity) json.readiumPublication = identity;
    } else delete json.text;
    if (typeof json.href === "string") {
        if (resourceBase && json.href.startsWith(resourceBase)) {
            json.href = json.href.slice(resourceBase.length);
        } else if (json.href.startsWith(config.apiUrl)) {
            json.href = json.href.slice(config.apiUrl.length);
        }
    }
    return JSON.stringify(json);
}

/**
 * Deserializes a cloud-stored position string, re-attaching the publication's
 * resource base URL (or config.apiUrl as fallback) to any relative href so the
 * locator works with the Readium navigator.
 *
 * Old unmarked native fragments/text remain unsupported. Readium quote evidence
 * is preserved, but its uniqueness must still be verified against destination text.
 */
export function deserializeLocatorFromCloud(position: string, resourceBase?: string): Locator | undefined {
    try {
        const json = JSON.parse(position) as Record<string, unknown>;
        if (typeof json.href === "string" && !json.href.startsWith("http")) {
            json.href = (resourceBase ?? config.apiUrl) + json.href;
        }
        const locator = Locator.deserialize(json);
        if (!locator) return undefined;
        if (locator.type === "application/pdf") return locator.copyWithLocations({
            progression: locator.locations.progression, totalProgression: locator.locations.totalProgression,
        });
        if (json.readiumEngine === "readium-2" && locator.text?.highlight) return new Locator({
            href: locator.href, type: locator.type, title: locator.title, text: locator.text,
            locations: new LocatorLocations({
                progression: locator.locations.progression, totalProgression: locator.locations.totalProgression,
                otherLocations: new Map<string, unknown>([
                    ...(typeof locator.locations.getCssSelector() === "string" ? [["cssSelector", locator.locations.getCssSelector()] as [string, unknown]] : []),
                    ...(json.readiumPublication ? [["homebranchPublication", json.readiumPublication] as [string, unknown]] : []),
                ]),
            }),
        });
        return new Locator({href: locator.href, type: locator.type, title: locator.title,
            locations: new LocatorLocations({progression: locator.locations.progression, totalProgression: locator.locations.totalProgression})});
    } catch {
        return undefined;
    }
}

export function isCfi(position: string): boolean {
    return position.startsWith("epubcfi(");
}

/**
 * Compares two locators using only cross-device-stable fields: href (normalized,
 * without the resource base URL or API URL) and within-chapter progression. Used
 * for conflict detection so that device-specific fields don't cause false positives.
 */
export function isSamePosition(a: Locator, b: Locator, resourceBase?: string, tolerance = 0.001): boolean {
    const normalize = (href: string) => {
        if (resourceBase && href.startsWith(resourceBase)) return href.slice(resourceBase.length);
        if (href.startsWith(config.apiUrl)) return href.slice(config.apiUrl.length);
        return href;
    };

    // Also compare by filename as a fallback for cross-platform hrefs
    const filename = (href: string) => normalize(href).split("/").pop();

    const normalA = normalize(a.href);
    const normalB = normalize(b.href);
    if (normalA !== normalB && (a.text?.highlight || b.text?.highlight)) return false;
    if (normalA !== normalB && filename(a.href) !== filename(b.href)) return false;
    if (!!a.text?.highlight !== !!b.text?.highlight) return false;
    if (a.text?.highlight && b.text?.highlight && (a.text.highlight !== b.text.highlight || a.text.before !== b.text.before)) return false;

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
