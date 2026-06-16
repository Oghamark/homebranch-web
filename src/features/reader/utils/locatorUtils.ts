import { Locator } from "@readium/shared";
import { config } from "@/shared";

/**
 * Strips the API base URL from a locator's href so it can be stored in the cloud
 * and restored correctly regardless of which URL the client uses to access the API.
 */
export function serializeLocatorForCloud(locator: Locator): string {
    const json = locator.serialize() as Record<string, unknown>;
    if (typeof json.href === "string" && json.href.startsWith(config.apiUrl)) {
        json.href = json.href.slice(config.apiUrl.length);
    }
    return JSON.stringify(json);
}

/**
 * Deserializes a cloud-stored position string, re-attaching the current API base URL
 * to any relative href so the locator works with the Readium navigator.
 */
export function deserializeLocatorFromCloud(position: string): Locator | undefined {
    try {
        const json = JSON.parse(position) as Record<string, unknown>;
        if (typeof json.href === "string" && !json.href.startsWith("http")) {
            json.href = config.apiUrl + json.href;
        }
        return Locator.deserialize(json);
    } catch {
        return undefined;
    }
}

export function isCfi(position: string): boolean {
    return position.startsWith("epubcfi(");
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
