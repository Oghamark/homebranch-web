import type {AnnotationAnchor} from "@/features/koreader/api";

// Resource identity is path-based, never a filename-only or fuzzy match.
export function resourceHref(href: string, base: string): string | null {
    try {
        const root = new URL(base.endsWith("/") ? base : `${base}/`);
        const url = new URL(href, root);
        if (url.origin !== root.origin || !url.pathname.startsWith(root.pathname)) return null;
        return url.pathname.slice(root.pathname.length).split("/").map(part => encodeURIComponent(decodeURIComponent(part))).join("/");
    } catch { return null; }
}

export function frameResourceHref(wnd: Window, base: string): string | null {
    if (wnd.location.protocol !== "blob:") return resourceHref(wnd.location.href, base);
    // Readium serves rewritten chapters from blob URLs and supplies their original
    // resource URL in its own base element. A blob URL itself is not a selector.
    const injectedBase = wnd.document.querySelector<HTMLBaseElement>("base[data-readium=true]");
    return injectedBase ? resourceHref(injectedBase.href, base) : null;
}

function textIndex(doc: Document) {
    const walker = doc.createTreeWalker(doc.body, 4);
    const nodes: {node: Text; start: number; end: number}[] = [];
    let text = "";
    let current: Node | null;
    while ((current = walker.nextNode())) {
        if (current.parentElement?.closest("script,style,noscript,template,[hidden],[aria-hidden=true]")) continue;
        const start = text.length;
        text += current.textContent ?? "";
        nodes.push({node: current as Text, start, end: text.length});
    }
    return {text, nodes};
}

export function annotationMatches(doc: Document, anchor: AnnotationAnchor, requireContext = false): number[] {
    if (!anchor.exact) return [];
    const {text} = textIndex(doc);
    const matches: number[] = [];
    let offset = 0;
    while (offset <= text.length) {
        const start = text.indexOf(anchor.exact, offset);
        if (start < 0) break;
        matches.push(start);
        offset = start + 1;
    }
    // Context varies between engines at block boundaries. A unique literal quote
    // needs no context; multiple literal hits require uniquely matching context.
    if (matches.length === 1 && !requireContext) return matches;
    return matches.filter(start => {
        const end = start + anchor.exact.length;
        return (!anchor.prefix || text.slice(Math.max(0, start - anchor.prefix.length), start) === anchor.prefix)
            && (!anchor.suffix || text.slice(end, end + anchor.suffix.length) === anchor.suffix);
    });
}

export function resolveAnnotationRange(doc: Document, anchor: AnnotationAnchor): Range | null {
    const matches = annotationMatches(doc, anchor);
    if (matches.length !== 1) return null;
    const {nodes} = textIndex(doc);
    const start = matches[0], end = start + anchor.exact.length;
    const first = nodes.find(n => n.end > start);
    const last = nodes.find(n => n.start < end && n.end >= end);
    if (!first || !last) return null;
    const range = doc.createRange();
    range.setStart(first.node, start - first.start);
    range.setEnd(last.node, end - last.start);
    return range;
}

export function captureAnnotationSelection(wnd: Window, base: string): AnnotationAnchor | null {
    const selection = wnd.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount !== 1) return null;
    const range = selection.getRangeAt(0);
    if (!wnd.document.body.contains(range.commonAncestorContainer)) return null;
    const href = frameResourceHref(wnd, base);
    if (!href) return null;
    const {text, nodes} = textIndex(wnd.document);
    const boundary = (node: Node, offset: number) => {
        if (node.nodeType === 3) {
            const item = nodes.find(n => n.node === node);
            return item ? item.start + offset : null;
        }
        const preceding = wnd.document.createRange();
        preceding.selectNodeContents(wnd.document.body);
        preceding.setEnd(node, offset);
        return nodes.reduce((total, item) => total + (preceding.intersectsNode(item.node) ? (() => {
            const end = preceding.endContainer === item.node ? preceding.endOffset : item.node.length;
            return end;
        })() : 0), 0);
    };
    const start = boundary(range.startContainer, range.startOffset);
    const end = boundary(range.endContainer, range.endOffset);
    if (start === null || end === null || end <= start) return null;
    const exact = text.slice(start, end);
    if (!exact.trim() || exact !== range.toString()) return null;
    const anchor: AnnotationAnchor = {version: 1, href, exact, prefix: text.slice(Math.max(0, start - 64), start), suffix: text.slice(end, end + 64)};
    // Even local creation must round-trip uniquely. Repeated contexts are unresolved.
    const resolved = resolveAnnotationRange(wnd.document, anchor);
    return resolved?.toString() === exact ? anchor : null;
}

export const annotationPalette = {yellow: "#ffff00", green: "#90ee90", blue: "#87cefa", red: "#ff8080", orange: "#ffa500", purple: "#c8a2c8", gray: "#c0c0c0"} as const;
export const annotationColors = Object.keys(annotationPalette) as (keyof typeof annotationPalette)[];
export function annotationColorValue(color: string): string {
    if (Object.prototype.hasOwnProperty.call(annotationPalette, color)) return annotationPalette[color as keyof typeof annotationPalette];
    return Object.values(annotationPalette).find(value => value === color.toLowerCase()) ?? annotationPalette.yellow;
}

type HighlightWindow = Window & {
    Highlight?: new (...ranges: Range[]) => unknown;
    CSS?: {highlights?: {set(name: string, value: unknown): void; delete(name: string): void}};
};

export function renderAnnotationRanges(wnd: Window, ranges: {id: string; color: string; range: Range}[]) {
    const win = wnd as HighlightWindow;
    const registry = win.CSS?.highlights;
    if (!registry || typeof registry.set !== "function" || typeof registry.delete !== "function" || typeof win.Highlight !== "function") return null;
    const style = wnd.document.createElement("style");
    style.dataset.homebranchAnnotations = "true";
    style.textContent = annotationColors.map(color =>
        `::highlight(homebranch-${color}) { background-color: ${annotationPalette[color]}; color: #111; }`).join("\n");
    wnd.document.head.appendChild(style);
    const cleanup = () => {
        for (const color of annotationColors) registry.delete(`homebranch-${color}`);
        style.remove();
    };
    try {
        for (const color of annotationColors) {
            registry.set(`homebranch-${color}`, new win.Highlight(...ranges.filter(r => annotationColorValue(r.color) === annotationPalette[color]).map(r => r.range)));
        }
        return cleanup;
    } catch {
        cleanup();
        return null;
    }
}
