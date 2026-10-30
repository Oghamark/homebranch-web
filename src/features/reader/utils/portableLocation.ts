import {Locator, LocatorLocations, LocatorText} from "@readium/shared";
import type {LocationMap, LocationResource, PortableLocation, QuoteAnchor} from "../types/PortableLocation";

const blocks = new Set("address article aside blockquote br caption dd details div dl dt fieldset figcaption figure footer form h1 h2 h3 h4 h5 h6 header hr li main nav ol p pre section table tbody td th thead tr ul".split(" "));
type Point = {node: Text; offset: number};
export interface CanonicalText {text: string; points: (Point | null)[]}

// Match the API's publication text convention, not innerText (which changes with layout).
export function canonicalText(doc: Document): CanonicalText {
    let text = "";
    const points: (Point | null)[] = [];
    let pendingSpace = false;
    const space = () => { if (text) pendingSpace = true; };
    const visit = (node: Node) => {
        if (node.nodeType === 3) {
            const value = node.textContent ?? "";
            for (let offset = 0; offset < value.length; offset++) {
                if (/\s/.test(value[offset])) { space(); continue; }
                if (pendingSpace) { text += " "; points.push(null); pendingSpace = false; }
                text += value[offset]; points.push({node: node as Text, offset});
            }
        } else if (node.nodeType === 1) {
            const el = node as HTMLElement;
            const tag = el.tagName.toLowerCase();
            if (["script", "style", "head", "template", "noscript"].includes(tag)
                || el.hasAttribute("hidden") || el.getAttribute("aria-hidden") === "true"
                || /display\s*:\s*none|visibility\s*:\s*hidden/i.test(el.getAttribute("style") ?? "")) return;
            if (blocks.has(tag)) space();
            node.childNodes.forEach(visit);
            if (blocks.has(tag)) space();
        }
    };
    if (doc.body) visit(doc.body);
    return {text, points};
}

export function canonicalHref(href: string, base: string): string | null {
    try {
        const root = new URL(base.endsWith("/") ? base : `${base}/`);
        const url = new URL(href, root);
        if (root.origin !== url.origin || !url.pathname.startsWith(root.pathname)) return null;
        return decodeURIComponent(url.pathname.slice(root.pathname.length));
    } catch { return null; }
}

const fraction = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;
export function compatibleLocation(map: LocationMap, location: PortableLocation): boolean {
    return location.version === 1 && map.version === 1 && map.formatId === location.formatId
        && map.contentHash === location.contentHash && map.fingerprint === location.mapFingerprint;
}
export function chapterAt(map: LocationMap, offset: number) {
    const end = map.resources.at(-1)?.end;
    return map.chapters.find(ch => ch.end > ch.start && offset >= ch.start
        && (offset < ch.end || (offset === end && ch.end === end)));
}

export function uniqueAnchorOffset(text: string, anchor?: QuoteAnchor): number | null {
    if (!anchor?.exact) return null;
    const matches: number[] = [];
    for (let at = text.indexOf(anchor.exact); at >= 0; at = text.indexOf(anchor.exact, at + 1)) {
        const end = at + anchor.exact.length;
        const prefix = anchor.prefix?.slice(-Math.min(at, anchor.prefix.length)) ?? "";
        const suffix = anchor.suffix?.slice(0, text.length - end) ?? "";
        if ((!anchor.prefix || (at === 0 || text.slice(at - prefix.length, at) === prefix))
            && (!anchor.suffix || text.slice(end, end + suffix.length) === suffix)) matches.push(at);
    }
    return matches.length === 1 ? matches[0] : null;
}

export function verifiedResource(map: LocationMap, resource: LocationResource, index: CanonicalText, verifyChapters = true): boolean {
    const boundaryMatches = (anchor: QuoteAnchor | undefined, at: number, fragment?: string) => {
        if (at < 0 || at >= index.text.length) return false;
        if (fragment) {
            const doc = index.points.find(Boolean)?.node.ownerDocument;
            const matches = doc?.querySelectorAll(`[id=${JSON.stringify(fragment)}]`);
            if (matches?.length === 1) {
                const element = matches[0];
                const boundary = index.points.findIndex(point => point && (element.contains(point.node)
                    || !!(element.compareDocumentPosition(point.node) & 4)));
                if (boundary === at) return true;
            }
        }
        if (!anchor) return !fragment && at === 0;
        const available = index.text.length - at;
        const clipped = anchor.exact.slice(0, available);
        return uniqueAnchorOffset(index.text, {...anchor, exact: clipped,
            ...(clipped.length < anchor.exact.length ? {suffix: undefined} : {})}) === at;
    };
    return index.text.length === resource.end - resource.start
        && (!index.text.length || boundaryMatches(resource.anchor, 0))
        && (!verifyChapters || map.chapters.filter(ch => ch.href === resource.href && ch.kind === "chapter").every(ch =>
            boundaryMatches(ch.anchor, ch.start - resource.start, ch.fragment)));
}

export function firstVisibleOffset(wnd: Window, index: CanonicalText): number | null {
    let previous: Text | null = null;
    let nodeVisible = false;
    for (let i = 0; i < index.points.length; i++) {
        const point = index.points[i];
        if (!point) continue;
        if (point.node !== previous) {
            previous = point.node;
            const range = wnd.document.createRange();
            range.selectNodeContents(point.node);
            nodeVisible = [...range.getClientRects()].some(r => r.width > 0 && r.height > 0
                && r.right > 0 && r.left < wnd.innerWidth && r.bottom > 0 && r.top < wnd.innerHeight);
        }
        if (!nodeVisible) continue;
        const range = wnd.document.createRange();
        range.setStart(point.node, point.offset);
        range.setEnd(point.node, point.offset + 1);
        if ([...range.getClientRects()].some(r => r.width > 0 && r.height > 0 && r.left >= -0.5
            && r.right <= wnd.innerWidth + 0.5 && r.top >= -0.5 && r.bottom <= wnd.innerHeight + 0.5)) return i;
    }
    return null;
}

export function capturePortableLocation(map: LocationMap, href: string, offset: number): PortableLocation | null {
    const resource = map.resources.find(r => r.href === href);
    if (!resource || !Number.isFinite(offset) || offset < 0 || offset > resource.end - resource.start) return null;
    const global = resource.start + offset;
    const chapter = chapterAt(map, global);
    return {version: 1, formatId: map.formatId, contentHash: map.contentHash, mapFingerprint: map.fingerprint,
        href, resourceProgression: resource.end > resource.start ? offset / (resource.end - resource.start) : 0,
        ...(chapter ? {chapterId: chapter.id, chapterProgression: (global - chapter.start) / (chapter.end - chapter.start)} : {}),
        basis: "text"};
}

export interface PortableTarget {href: string; offset: number; label: string; quality: "chapter" | "resource"}
export function resolvePortableTarget(map: LocationMap, location: PortableLocation): PortableTarget | null {
    if (!compatibleLocation(map, location) || !fraction(location.resourceProgression)
        || !["text", "rendered"].includes(location.basis)) return null;
    const resource = map.resources.find(r => r.href === location.href);
    if (!resource) return null;
    let start = resource.start, end = resource.end;
    let label = "Resource fallback";
    let quality: PortableTarget["quality"] = "resource";
    let progression = location.resourceProgression;
    if (location.chapterId !== undefined || location.chapterProgression !== undefined) {
        const chapter = map.chapters.find(ch => ch.id === location.chapterId);
        if (!chapter || !fraction(location.chapterProgression) || chapter.end <= chapter.start
            || resource.end <= chapter.start || resource.start >= chapter.end) return null;
        if (location.basis === "text" && Math.abs(
            resource.start + location.resourceProgression * (resource.end - resource.start)
            - (chapter.start + location.chapterProgression * (chapter.end - chapter.start))) > 2) return null;
        start = chapter.start; end = chapter.end; progression = location.chapterProgression;
        quality = chapter.kind === "chapter" ? "chapter" : "resource";
        label = `${chapter.title}, approximately ${Math.round(progression * 100)}% through ${quality}`;
    } else label = `Resource fallback, approximately ${Math.round(progression * 100)}% through resource`;
    // The target character must remain inside a half-open section, even at 100%.
    const global = Math.min(end - 1, Math.max(start, Math.floor(start + progression * (end - start))));
    const target = map.resources.find(r => global >= r.start && global < r.end);
    // Separator whitespace belongs to neither resource; choose the following verified resource.
    const next = target ?? map.resources.find(r => r.start === global + 1 && r.start < end)
        ?? map.resources.find(r => r.end === global && r.end > start);
    return next ? {href: next.href, offset: Math.min(next.end - next.start - 1, Math.max(0, global - next.start)), label, quality} : null;
}

export function textLocator(position: Locator, index: CanonicalText, offset: number, bounds = {start: 0, end: index.text.length}): Locator | null {
    if (offset < bounds.start || offset >= bounds.end) return null;
    const point = index.points[offset] ?? index.points.slice(offset, bounds.end).find(Boolean)
        ?? index.points.slice(bounds.start, offset).reverse().find(Boolean);
    if (!point) return null;
    const raw = point.node.data;
    const highlight = raw.slice(point.offset, point.offset + 96);
    if (!highlight.trim()) return null;
    const parent = point.node.parentElement;
    let selector: string | undefined;
    if (parent?.id) {
        const candidate = `[id=${JSON.stringify(parent.id)}]`;
        try {
            const matches = point.node.ownerDocument.querySelectorAll(candidate);
            if (matches.length === 1 && matches[0] === parent) selector = candidate;
        } catch { /* Use globally unique quote evidence when an ID is not a usable CSS selector. */ }
    }
    const scope = selector ? parent?.textContent ?? "" : index.text;
    const normalizedScope = scope.replace(/\s+/g, " ").trim();
    const before = raw.slice(Math.max(0, point.offset - 64), point.offset);
    const after = raw.slice(point.offset + highlight.length, point.offset + highlight.length + 64);
    const quote = (before + highlight + after).replace(/\s+/g, " ").trim();
    const first = normalizedScope.indexOf(quote);
    if (first < 0 || normalizedScope.indexOf(quote, first + 1) >= 0) return null;
    return new Locator({href: position.href, type: position.type, title: position.title,
        text: new LocatorText({highlight, before, after}),
        locations: new LocatorLocations({otherLocations: selector ? new Map([["cssSelector", selector]]) : undefined})});
}

export function preciseLocatorMatches(doc: Document, locator: Locator): boolean {
    if (!locator.text?.highlight) return false;
    return preciseLocatorOffset(doc, locator, canonicalText(doc)) !== null;
}

export function preciseLocatorOffset(doc: Document, locator: Locator, index: CanonicalText): number | null {
    try {
        const selector = locator.locations.getCssSelector();
        let scope: Element | null = doc.body;
        if (selector) {
            const matches = doc.querySelectorAll(selector);
            if (matches.length !== 1) return null;
            scope = matches[0];
        } else if (!locator.text?.highlight && locator.locations.fragments.length) {
            const id = decodeURIComponent(locator.locations.fragments[0]);
            const matches = doc.querySelectorAll(`[id=${JSON.stringify(id)}]`);
            if (matches.length !== 1) return null;
            scope = matches[0];
        }
        if (!scope) return null;
        if (!locator.text?.highlight) {
            if (!selector && !locator.locations.fragments.length) return null;
            const at = index.points.findIndex(point => point && (scope.contains(point.node)
                || !!(scope.compareDocumentPosition(point.node) & 4)));
            return at >= 0 ? at : null;
        }
        const first = index.points.findIndex(point => point && scope.contains(point.node));
        if (first < 0) return null;
        let last = index.points.length - 1;
        while (last > first && (!index.points[last] || !scope.contains(index.points[last]!.node))) last--;
        const normalize = (text?: string) => text?.replace(/\s+/g, " ");
        const start = uniqueAnchorOffset(index.text.slice(first, last + 1), {version: 1,
            exact: normalize(locator.text.highlight)!, prefix: normalize(locator.text.before),
            suffix: normalize(locator.text.after)});
        return start !== null && index.points[first + start] ? first + start : null;
    } catch { return null; }
}

export function withPublicationIdentity(locator: Locator, map: LocationMap): Locator {
    return new Locator({href: locator.href, type: locator.type, title: locator.title, text: locator.text,
        locations: new LocatorLocations({...locator.locations,
            otherLocations: new Map([...(locator.locations.otherLocations ?? []), ["homebranchPublication",
                {formatId: map.formatId, contentHash: map.contentHash, mapFingerprint: map.fingerprint}]])})});
}

export function precisePublicationMatches(locator: Locator, map: LocationMap | null): boolean {
    const identity = locator.locations.otherLocations?.get("homebranchPublication") as Partial<PortableLocation> | undefined;
    return !identity || (!!map && identity.formatId === map.formatId && identity.contentHash === map.contentHash
        && identity.mapFingerprint === map.fingerprint);
}

export function portableLabel(map: LocationMap | null, location?: PortableLocation | null): string | null {
    if (!map || !location || !compatibleLocation(map, location)) return null;
    const chapter = map.chapters.find(ch => ch.id === location.chapterId);
    return chapter && fraction(location.chapterProgression)
        ? `${chapter.title} · ${Math.round(location.chapterProgression * 100)}% through ${chapter.kind === "chapter" ? "chapter" : "resource"} (approx.)`
        : `Resource · ${Math.round(location.resourceProgression * 100)}% (approx.)`;
}

export function approximateChapterPage(wnd: Window, index: CanonicalText, map: LocationMap, href: string, offset: number, scroll: boolean): string | null {
    const resource = map.resources.find(r => r.href === href);
    if (!resource) return null;
    const chapter = chapterAt(map, resource.start + offset);
    if (!chapter || chapter.kind !== "chapter" || chapter.start < resource.start || chapter.end > resource.end + 1) return null;
    const coordinate = (at: number, backwards = false) => {
        const point = index.points[at] ?? (backwards
            ? index.points.slice(0, at).reverse().find(Boolean)
            : index.points.slice(at).find(Boolean));
        if (!point) return null;
        const range = wnd.document.createRange();
        range.setStart(point.node, point.offset); range.setEnd(point.node, point.offset + 1);
        const rect = range.getBoundingClientRect();
        if (!rect.width || !rect.height) return null;
        return scroll ? rect.top + wnd.scrollY : Math.abs(rect.left + wnd.scrollX);
    };
    const start = coordinate(chapter.start - resource.start);
    const end = coordinate(Math.min(index.text.length - 1, chapter.end - resource.start - 1), true);
    const current = coordinate(offset);
    const extent = scroll ? wnd.innerHeight : wnd.innerWidth;
    if (start === null || end === null || current === null || extent <= 0) return null;
    const first = Math.floor(start / extent), last = Math.floor(end / extent);
    if (last < first) return null;
    const count = last - first + 1;
    const page = Math.max(1, Math.min(count, Math.floor(current / extent) - first + 1));
    return `about page ${page} of ${count} in this chapter on this device`;
}
