import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {getAnnotations, putAnnotation, type Annotation, type AnnotationMutation} from "./api";
import {annotationId} from "./annotationId";

interface Operation {id: string; body: AnnotationMutation}
interface StoredAnnotations {items: Annotation[]; cursor: string; pending: Operation[]}
const empty = (): StoredAnnotations => ({items: [], cursor: "", pending: []});

export function useAnnotations(bookId: string, enabled: boolean) {
    const account = sessionStorage.getItem("user_id");
    const key = account ? `koreader_annotations_${account}_${bookId}` : null;
    const store = useRef<StoredAnnotations>(empty());
    const activeKey = useRef(key);
    const locked = useRef<string | null>(null);
    const storageReady = useRef(false);
    const [version, setVersion] = useState(0);
    const [error, setError] = useState("");
    const [syncing, setSyncing] = useState(false);
    const isCurrent = useCallback(() => activeKey.current === key && sessionStorage.getItem("user_id") === account, [key, account]);
    const persist = useCallback(() => {
        if (!key || !isCurrent()) return;
        localStorage.setItem(key, JSON.stringify(store.current));
        setVersion(v => v + 1);
    }, [key, isCurrent]);
    const refresh = useCallback(async () => {
        if (!enabled || !key || !isCurrent() || locked.current === key || !storageReady.current) return;
        locked.current = key; setSyncing(true); setError("");
        try {
            persist();
            while (store.current.pending.length && isCurrent()) {
                const operation = store.current.pending[0];
                const accepted = await putAnnotation(bookId, operation.id, operation.body);
                if (!isCurrent()) return;
                store.current.items = [...store.current.items.filter(item => item.id !== accepted.id), accepted];
                store.current.pending = store.current.pending.filter(item => item.body.mutationId !== operation.body.mutationId);
                persist();
            }
            let pages = 0;
            while (isCurrent()) {
                const page = await getAnnotations(bookId, store.current.cursor);
                if (!isCurrent()) return;
                const byId = new Map(store.current.items.map(item => [item.id, item]));
                for (const item of page.items) byId.set(item.id, item);
                store.current.items = [...byId.values()];
                const previous = store.current.cursor;
                store.current.cursor = page.cursor;
                persist();
                if (!page.hasMore) break;
                if (page.cursor === previous || ++pages >= 100) throw new Error("Annotation sync pagination did not finish");
            }
        } catch {
            if (isCurrent()) setError("Annotation sync failed. Pending changes remain on this device. Retry when online.");
        } finally {
            if (locked.current === key) locked.current = null;
            if (isCurrent()) setSyncing(false);
        }
    }, [enabled, key, isCurrent, bookId, persist]);

    useEffect(() => {
        activeKey.current = key;
        store.current = empty();
        storageReady.current = false;
        setError("");
        if (enabled && key) {
            try {
                const raw = localStorage.getItem(key);
                if (raw) {
                    const saved = JSON.parse(raw) as StoredAnnotations;
                    if (!Array.isArray(saved.items) || !Array.isArray(saved.pending) || typeof saved.cursor !== "string") throw new Error("Invalid annotation cache");
                    store.current = saved;
                }
                storageReady.current = true;
            } catch { setError("Unable to read saved annotation changes on this device. Sync has not started."); setVersion(v => v + 1); return; }
        }
        setVersion(v => v + 1);
        void refresh();
        const visibleRefresh = () => { if (document.visibilityState !== "hidden") void refresh(); };
        window.addEventListener("online", visibleRefresh);
        window.addEventListener("focus", visibleRefresh);
        document.addEventListener("visibilitychange", visibleRefresh);
        const timer = window.setInterval(visibleRefresh, 30_000);
        return () => {
            activeKey.current = null;
            window.removeEventListener("online", visibleRefresh);
            window.removeEventListener("focus", visibleRefresh);
            document.removeEventListener("visibilitychange", visibleRefresh);
            window.clearInterval(timer);
        };
    }, [key, enabled, refresh]);

    const mutate = useCallback((id: string, body: Omit<AnnotationMutation, "mutationId">) => {
        if (!enabled || !key || !isCurrent() || !storageReady.current) { setError("Sign in again or reload saved annotations before editing."); return false; }
        store.current.pending.push({id, body: {...body, mutationId: annotationId()}});
        try { persist(); }
        catch { setError("Unable to persist pending annotations. Free browser storage before retrying."); setVersion(v => v + 1); return false; }
        void refresh();
        return true;
    }, [enabled, key, isCurrent, persist, refresh]);
    // Overlay pending changes after remote data, including tombstones.
    const items = useMemo(() => {
        const byId = new Map(store.current.items.map(item => [item.id, item]));
        for (const operation of store.current.pending) {
            byId.set(operation.id, {...byId.get(operation.id), ...operation.body, id: operation.id, bookId, deleted: operation.body.deleted ?? false, revision: "", updatedAt: ""});
        }
        return [...byId.values()].filter(item => !item.deleted);
    }, [version, bookId]);
    return {items, pending: store.current.pending.length, error, syncing, mutate, refresh};
}
