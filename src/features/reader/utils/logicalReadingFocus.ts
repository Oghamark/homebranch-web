import type {Locator} from "@readium/shared";
import type {LocationMap} from "../types/PortableLocation";
import {frameResourceHref} from "./annotationCodec";
import {canonicalHref, canonicalText, preciseLocatorOffset, precisePublicationMatches, verifiedResource} from "./portableLocation";
import type {CanonicalText} from "./portableLocation";

function pointVisible(wnd: Window, index: CanonicalText, offset: number): boolean {
    const point = index.points[offset];
    if (!point) return false;
    const range = wnd.document.createRange();
    range.setStart(point.node, point.offset);
    range.setEnd(point.node, point.offset + 1);
    return [...range.getClientRects()].some(rect => rect.width > 0 && rect.height > 0
        && rect.right > 0 && rect.left < wnd.innerWidth && rect.bottom > 0 && rect.top < wnd.innerHeight);
}

export function hasPreciseTarget(locator: Locator): boolean {
    return !!(locator.text?.highlight || locator.locations.getCssSelector() || locator.locations.fragments.length);
}

// A selected passage is a logical point, not the beginning of its physical page.
// Retain it across repagination, but never invent it from a percentage or an ACK.
export class LogicalReadingFocus {
    private selected: Locator | null = null;
    private generation = 0;
    private href: string | null = null;
    private publication: LocationMap | null = null;

    get locator(): Locator | null { return this.selected; }
    clear() { this.generation++; this.selected = null; this.href = null; this.publication = null; }

    capture(wnd: Window, index: CanonicalText, map: LocationMap, href: string): number | null {
        const locator = this.selected;
        if (!locator || href !== this.href || this.publication?.fingerprint !== map.fingerprint
            || this.publication.formatId !== map.formatId || this.publication.contentHash !== map.contentHash
            || !precisePublicationMatches(locator, map)) return null;
        const point = preciseLocatorOffset(wnd.document, locator, index);
        const resource = map.resources.find(resource => resource.href === href);
        if (!resource || !verifiedResource(map, resource, index, false)) return null;
        return point !== null && pointVisible(wnd, index, point) ? point : null;
    }

    async select(locator: Locator, container: HTMLElement, map: LocationMap, base: string,
        reapply?: () => Promise<boolean>): Promise<boolean> {
        const generation = ++this.generation;
        this.selected = locator;
        const href = canonicalHref(locator.href, base);
        this.href = href;
        this.publication = map;
        for (let attempt = 0; attempt < 30; attempt++) {
            if (generation !== this.generation) return false;
            // Readium can ACK before a preceding layout commit has finished.
            if (reapply && (attempt === 10 || attempt === 20)) {
                if (!await reapply() || generation !== this.generation) break;
            }
            for (const frame of container.querySelectorAll<HTMLIFrameElement>("iframe.readium-navigator-iframe")) {
                const wnd = frame.contentWindow;
                if (!wnd?.document.body || !frame.getBoundingClientRect().width
                    || frame.ownerDocument.defaultView?.getComputedStyle(frame).visibility === "hidden"
                    || decodeURIComponent(frameResourceHref(wnd, base) ?? "") !== href) continue;
                const index = canonicalText(wnd.document);
                if (href && this.capture(wnd, index, map, href) !== null) return true;
            }
            await new Promise(resolve => setTimeout(resolve, 20));
        }
        if (generation === this.generation) this.selected = null;
        return false;
    }
}
