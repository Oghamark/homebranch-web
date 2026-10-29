import {useEffect, useMemo, useState, type RefObject} from "react";
import type {EpubNavigator} from "@readium/navigator";
import type {Annotation} from "@/features/koreader/api";
import {annotationMatches, resourceHref} from "../utils/annotationCodec";

export function useResolvedAnnotations(items: Annotation[], navigatorRef: RefObject<EpubNavigator | null>, loaded: boolean, bookId: string) {
    const [documents, setDocuments] = useState<{href: string; doc: Document}[] | null>(null);
    const [error, setError] = useState("");
    const [attempt, setAttempt] = useState(0);
    const needsSearch = items.some(item => !item.anchor.href);
    useEffect(() => { setDocuments(null); setError(""); }, [bookId]);
    useEffect(() => {
        if (!loaded || !needsSearch || documents) return;
        const publication = navigatorRef.current?.publication;
        if (!publication?.baseURL) return;
        let cancelled = false;
        const load = async () => {
            setError("");
            const result: {href: string; doc: Document}[] = [];
            for (const link of publication.readingOrder.items) {
                if (cancelled) return;
                const resource = publication.get(link);
                try {
                    const text = await resource.readAsString();
                    const href = resourceHref(link.href, publication.baseURL!);
                    if (!text || !href) throw new Error("Missing EPUB resource");
                    result.push({href, doc: new DOMParser().parseFromString(text, "text/html")});
                } finally { resource.close(); }
            }
            if (!cancelled) setDocuments(result);
        };
        void load().catch(() => { if (!cancelled) setError("Unable to verify native annotation quotes across the EPUB. They remain unresolved. Retry when online."); });
        return () => { cancelled = true; };
    }, [loaded, needsSearch, documents, navigatorRef, bookId, attempt]);
    useEffect(() => {
        if (!needsSearch || documents) return;
        const retry = () => { if (document.visibilityState !== "hidden") setAttempt(value => value + 1); };
        window.addEventListener("online", retry);
        window.addEventListener("focus", retry);
        document.addEventListener("visibilitychange", retry);
        return () => {
            window.removeEventListener("online", retry);
            window.removeEventListener("focus", retry);
            document.removeEventListener("visibilitychange", retry);
        };
    }, [needsSearch, documents]);
    const resolved = useMemo(() => {
        const unresolved: Record<string, string> = {};
        const mapped = items.map(item => {
            if (item.anchor.href) return item;
            if (!documents) {
                unresolved[item.id] = "Unresolved: waiting for whole-book quote verification";
                return item;
            }
            const literalMatches: string[] = [];
            const contextualMatches: string[] = [];
            for (const resource of documents) {
                for (const _match of annotationMatches(resource.doc, {...item.anchor, prefix: undefined, suffix: undefined})) literalMatches.push(resource.href);
                for (const _match of annotationMatches(resource.doc, item.anchor, true)) contextualMatches.push(resource.href);
            }
            const matches = literalMatches.length === 1 ? literalMatches : contextualMatches;
            if (matches.length === 1) return {...item, anchor: {...item.anchor, href: matches[0]}};
            unresolved[item.id] = literalMatches.length ? "Unresolved: repeated quote lacks unique exact context" : "Unresolved: exact quote missing from EPUB";
            return item;
        });
        return {items: mapped, unresolved};
    }, [items, documents]);
    return {...resolved, error, searching: needsSearch && !documents && !error, retry: () => setAttempt(value => value + 1)};
}
