import {useCallback, useEffect, useRef, useState} from "react";
import type {Annotation, AnnotationAnchor} from "@/features/koreader/api";
import {captureAnnotationSelection, frameResourceHref, renderAnnotationRanges, resolveAnnotationRange, resourceHref} from "../utils/annotationCodec";

export function useAnnotationFrames(items: Annotation[], resourceBase: React.RefObject<string | undefined>, theme: unknown, containerRef?: React.RefObject<HTMLElement | null>) {
    const frames = useRef(new Map<Window, {doc: Document; cleanup: () => void}>());
    const drawings = useRef(new Map<Window, () => void>());
    const [selection, setSelection] = useState<AnnotationAnchor | null>(null);
    const [resolution, setResolution] = useState<Record<string, string>>({});
    const [frameVersion, setFrameVersion] = useState(0);
    const capture = useCallback((active?: Window) => {
        const candidates = active ? [active] : [...frames.current.keys()].sort((a, b) => Number(b.document.hasFocus()) - Number(a.document.hasFocus()));
        for (const wnd of candidates) {
            if (!wnd.getSelection()?.toString()) continue;
            const anchor = resourceBase.current ? captureAnnotationSelection(wnd, resourceBase.current) : null;
            setSelection(anchor);
            return;
        }
    }, [resourceBase]);
    const register = useCallback((wnd: Window) => {
        const doc = wnd.document;
        const previous = frames.current.get(wnd);
        if (previous?.doc === doc) return;
        previous?.cleanup();
        const onSelection = () => capture(wnd);
        let selectingTouch = false;
        const touchStart = (event: Event) => {
            selectingTouch = !!wnd.getSelection()?.toString();
            if (selectingTouch) event.stopImmediatePropagation();
        };
        const touchMove = (event: Event) => {
            selectingTouch ||= !!wnd.getSelection()?.toString();
            if (selectingTouch) event.stopImmediatePropagation();
        };
        const touchEnd = (event: Event) => {
            if (selectingTouch || wnd.getSelection()?.toString()) event.stopImmediatePropagation();
            selectingTouch = false;
        };
        const cleanup = () => {
            doc.removeEventListener("selectionchange", onSelection);
            wnd.removeEventListener("touchstart", touchStart, true);
            wnd.removeEventListener("touchmove", touchMove, true);
            wnd.removeEventListener("touchend", touchEnd, true);
            wnd.removeEventListener("touchcancel", touchEnd, true);
            wnd.removeEventListener("unload", unload);
            drawings.current.get(wnd)?.();
            drawings.current.delete(wnd);
            frames.current.delete(wnd);
        };
        const unload = () => { cleanup(); setSelection(null); setFrameVersion(v => v + 1); };
        doc.addEventListener("selectionchange", onSelection);
        // Readium's column snapper deselects on touchmove. Keep native selection
        // handle gestures out of its JS handlers without canceling browser defaults.
        wnd.addEventListener("touchstart", touchStart, {capture: true, passive: true});
        wnd.addEventListener("touchmove", touchMove, {capture: true, passive: true});
        wnd.addEventListener("touchend", touchEnd, {capture: true, passive: true});
        wnd.addEventListener("touchcancel", touchEnd, {capture: true, passive: true});
        wnd.addEventListener("unload", unload);
        frames.current.set(wnd, {doc, cleanup});
        setFrameVersion(v => v + 1);
    }, [capture]);
    useEffect(() => {
        const container = containerRef?.current;
        if (!container) return;
        const observed = new Map<HTMLIFrameElement, {wnd: Window | null; doc: Document | null; load: () => void}>();
        const scan = () => {
            const current = new Set(container.querySelectorAll<HTMLIFrameElement>("iframe.readium-navigator-iframe"));
            for (const [iframe, record] of observed) {
                if (current.has(iframe)) continue;
                iframe.removeEventListener("load", record.load);
                if (record.wnd && frames.current.get(record.wnd)?.doc === record.doc) frames.current.get(record.wnd)?.cleanup();
                observed.delete(iframe);
                setFrameVersion(v => v + 1);
            }
            for (const iframe of current) {
                if (observed.has(iframe)) continue;
                const record = {wnd: null as Window | null, doc: null as Document | null, load: () => {}};
                record.load = () => {
                    const wnd = iframe.contentWindow;
                    if (!wnd?.document.body || !resourceBase.current || !frameResourceHref(wnd, resourceBase.current)) return;
                    record.wnd = wnd; record.doc = wnd.document;
                    register(wnd);
                };
                observed.set(iframe, record);
                iframe.addEventListener("load", record.load);
                record.load();
            }
        };
        // Cached/prefetched frames in Readium 2.4 can become active without another
        // frameLoaded callback. Observe our container's native iframe lifecycle too.
        const observer = new MutationObserver(scan);
        observer.observe(container, {childList: true, subtree: true});
        scan();
        return () => {
            observer.disconnect();
            for (const [iframe, record] of observed) iframe.removeEventListener("load", record.load);
        };
    }, [containerRef, register, resourceBase]);
    useEffect(() => {
        const status: Record<string, string> = {};
        for (const item of items) status[item.id] = item.anchor.href ? "Not in an open chapter" : "Unresolved: no EPUB resource selector";
        for (const [wnd] of frames.current) {
            drawings.current.get(wnd)?.();
            drawings.current.delete(wnd);
            const base = resourceBase.current;
            if (!base) continue;
            const href = frameResourceHref(wnd, base);
            const ranges: {id: string; color: string; range: Range}[] = [];
            for (const item of items) {
                if (!item.anchor.href || resourceHref(item.anchor.href, base) !== href) continue;
                const range = resolveAnnotationRange(wnd.document, item.anchor);
                if (!range) { status[item.id] = "Unresolved: quote missing or ambiguous"; continue; }
                ranges.push({id: item.id, color: item.color, range});
            }
            const cleanup = renderAnnotationRanges(wnd, ranges);
            if (cleanup) drawings.current.set(wnd, cleanup);
            for (const {id} of ranges) status[id] = cleanup ? "Highlighted in open chapter" : "Unresolved: this browser cannot render highlights";
        }
        setResolution(previous => Object.keys(previous).length === Object.keys(status).length
            && Object.entries(status).every(([id, value]) => previous[id] === value) ? previous : status);
    }, [items, resourceBase, theme, frameVersion]);
    useEffect(() => () => { for (const record of [...frames.current.values()]) record.cleanup(); }, []);
    const locate = useCallback((item: Annotation, scroll: boolean): number | null => {
        const base = resourceBase.current;
        if (!base || !item.anchor.href) return null;
        for (const wnd of frames.current.keys()) {
            if (frameResourceHref(wnd, base) !== resourceHref(item.anchor.href, base)) continue;
            const range = resolveAnnotationRange(wnd.document, item.anchor);
            if (!range || typeof range.getBoundingClientRect !== "function") return null;
            const rect = range.getBoundingClientRect();
            const element = wnd.document.scrollingElement as HTMLElement | null;
            if (!element) return null;
            const extent = scroll ? element.offsetHeight : element.scrollWidth;
            if (!extent) return null;
            const offset = scroll ? rect.top + wnd.scrollY - wnd.innerHeight / 2 : Math.abs(rect.left + wnd.scrollX);
            return Math.max(0, Math.min(1, offset / extent));
        }
        return null;
    }, [resourceBase]);
    return {register, capture, selection, clearSelection: () => setSelection(null), resolution, locate};
}
