import { useEffect, useRef, useState } from "react";
import { EpubNavigator, EpubPreferences } from "@readium/navigator";
import type { EpubNavigatorListeners } from "@readium/navigator";
import { HttpFetcher, Link, Locator, LocatorLocations, Manifest, Publication } from "@readium/shared";
import { axiosInstance } from "@/shared/api/axios";
import { getStoredProgress, storeProgress } from "../utils/readingProgress";
import { getInitialLocator } from "../utils/locatorUtils";
import { buildEpubPreferences } from "../utils/epubPreferences";
import type { ReaderThemeState } from "../types/ReaderTheme";
import type { BookModel } from "@/entities/book/model/BookModel";
import type {BookFormatType} from "@/entities/book/model/bookFormats";
import { getSavedPosition } from "../api/savedPositionApi";
import { getApproximateLocator, getExactFormatPosition, getResumeFormatPosition } from "../utils/savedPositionState";

const CHAPTER_TRANSITION_TIMEOUT_MS = 8000;

export interface UseEpubNavigatorResult {
    containerRef: React.RefObject<HTMLDivElement | null>;
    navigatorRef: React.RefObject<EpubNavigator | null>;
    isLoading: boolean;
    isLoaded: boolean;
    loadError: string | null;
    isChapterTransitioning: boolean;
    percentage: number | undefined;
    tocItems: Link[];
}

export function useEpubNavigator(
    book: BookModel,
    format: BookFormatType,
    themeState: ReaderThemeState,
    onLocationChange: (loc: string, percentage?: number) => void,
): UseEpubNavigatorResult {
    function deserializeLocator(position?: string | null): Locator | null {
        if (!position) return null;
        try {
            return Locator.deserialize(JSON.parse(position)) ?? null;
        } catch {
            return null;
        }
    }

    const containerRef = useRef<HTMLDivElement>(null);
    const navigatorRef = useRef<EpubNavigator | null>(null);
    const themeStateRef = useRef(themeState);
    themeStateRef.current = themeState;
    const onLocationChangeRef = useRef(onLocationChange);
    onLocationChangeRef.current = onLocationChange;
    const readingOrderItemsRef = useRef<Link[]>([]);
    const prefetchedHrefSetRef = useRef(new Set<string>());
    const activePrefetchControllerRef = useRef<AbortController | null>(null);
    const transitionTimeoutRef = useRef<number | null>(null);
    const pendingChapterTransitionRef = useRef(false);

    const [isLoading, setIsLoading] = useState(true);
    const [isLoaded, setIsLoaded] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [isChapterTransitioning, setIsChapterTransitioning] = useState(false);
    const [tocItems, setTocItems] = useState<Link[]>([]);
    const [percentage, setPercentage] = useState<number | undefined>(() => {
        const userId = sessionStorage.getItem("user_id");
        if (!userId) return undefined;
        return getStoredProgress(userId, book.id);
    });

    function normalizeHref(href?: string | null): string | null {
        if (!href) return null;
        return href.split("#")[0] ?? null;
    }

    function clearTransitionTimeout() {
        if (transitionTimeoutRef.current !== null) {
            window.clearTimeout(transitionTimeoutRef.current);
            transitionTimeoutRef.current = null;
        }
    }

    function clearChapterTransition() {
        pendingChapterTransitionRef.current = false;
        setIsChapterTransitioning(false);
        clearTransitionTimeout();
    }

    function beginChapterTransition(): boolean {
        if (pendingChapterTransitionRef.current) return false;
        pendingChapterTransitionRef.current = true;
        setIsChapterTransitioning(true);

        // Fallback so the reader never gets stuck if Readium doesn't emit a load/update signal.
        clearTransitionTimeout();
        transitionTimeoutRef.current = window.setTimeout(() => {
            clearChapterTransition();
        }, CHAPTER_TRANSITION_TIMEOUT_MS);

        return true;
    }

    // Main navigator lifecycle
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        let cancelled = false;
        let nav: EpubNavigator | null = null;

        async function init() {
            try {
                const { data: manifestJson } = await axiosInstance.get(
                    `/books/${book.id}/manifest?format=${format}`,
                    { headers: { Accept: "application/webpub+json" } },
                );

                const manifest = Manifest.deserialize(manifestJson);
                if (!manifest) throw new Error("Invalid publication manifest");

                const fetchWithCredentials = (input: RequestInfo | URL, init?: RequestInit) =>
                    fetch(input, { ...init, credentials: "include" });

                const publication = new Publication({
                    manifest,
                    fetcher: new HttpFetcher(fetchWithCredentials, manifest.baseURL ?? ""),
                });

                const readingOrderItems = manifest.readingOrder?.items ?? [];
                readingOrderItemsRef.current = readingOrderItems;
                prefetchedHrefSetRef.current.clear();
                const positions = readingOrderItems.map((item, index) =>
                    new Locator({
                        href: item.href,
                        type: item.type ?? "application/xhtml+xml",
                        locations: new LocatorLocations({
                            position: index + 1,
                            totalProgression: readingOrderItems.length > 1
                                ? index / (readingOrderItems.length - 1)
                                : 0,
                        }),
                    }),
                );

                const savedPosition = await getSavedPosition(book.id).catch(() => null);
                const activeLocalLocator = getInitialLocator(book.id, true);
                const fallbackLocalLocator = getInitialLocator(book.id, false);
                const activeCloudLocator = deserializeLocator(getResumeFormatPosition(savedPosition?.position, "EPUB"));
                const fallbackCloudLocator = deserializeLocator(getExactFormatPosition(savedPosition?.position, "EPUB"));
                const approximateLocator = getApproximateLocator(positions, savedPosition);
                const initialLocator =
                    activeLocalLocator ??
                    activeCloudLocator ??
                    approximateLocator ??
                    fallbackLocalLocator ??
                    fallbackCloudLocator ??
                    positions[0];

                async function prefetchNextSpineItem(currentHref?: string | null) {
                    const normalizedCurrentHref = normalizeHref(currentHref);
                    if (!normalizedCurrentHref) return;

                    const currentIndex = readingOrderItems.findIndex(
                        (item) => normalizeHref(item.href) === normalizedCurrentHref,
                    );
                    const nextItem = currentIndex >= 0 ? readingOrderItems[currentIndex + 1] : undefined;
                    const nextHref = normalizeHref(nextItem?.href);

                    if (!nextItem || !nextHref || prefetchedHrefSetRef.current.has(nextHref)) return;

                    prefetchedHrefSetRef.current.add(nextHref);
                    activePrefetchControllerRef.current?.abort();

                    const controller = new AbortController();
                    activePrefetchControllerRef.current = controller;

                    try {
                        await publication.get(nextItem).read();
                    } catch (error) {
                        if (controller.signal.aborted) return;
                        prefetchedHrefSetRef.current.delete(nextHref);
                    } finally {
                        if (activePrefetchControllerRef.current === controller) {
                            activePrefetchControllerRef.current = null;
                        }
                    }
                }

                const listeners: EpubNavigatorListeners = {
                    frameLoaded: () => {
                        if (cancelled) return;
                        clearChapterTransition();
                    },
                    positionChanged: (locator: Locator) => {
                        if (cancelled) return;
                        clearChapterTransition();
                        void prefetchNextSpineItem(locator.href);
                        const progress = locator.locations?.totalProgression;
                        if (progress !== undefined) {
                            setPercentage(progress);
                            const userId = sessionStorage.getItem("user_id");
                            if (userId) storeProgress(userId, book.id, progress);
                        }
                        onLocationChangeRef.current(JSON.stringify(locator.serialize()), progress);
                    },
                    tap: (e) => e.interactiveElement == null,
                    click: (e) => e.interactiveElement == null,
                    zoom: () => {},
                    miscPointer: () => {},
                    scroll: () => {},
                    customEvent: () => {},
                    handleLocator: () => false,
                    textSelected: () => {},
                    contentProtection: () => {},
                    contextMenu: () => {},
                    peripheral: (data) => {
                        if (data.key === "ArrowRight" || data.key === "ArrowDown") nav?.goForward(false, () => {});
                        else if (data.key === "ArrowLeft" || data.key === "ArrowUp") nav?.goBackward(false, () => {});
                    },
                };

                if (cancelled) return;

                nav = new EpubNavigator(
                    container!,
                    publication,
                    listeners,
                    positions,
                    initialLocator,
                    { preferences: new EpubPreferences(buildEpubPreferences(themeStateRef.current)), defaults: {} },
                );

                const guardedNav = nav as unknown as {
                    changeResource?: (relative: number) => Promise<boolean>;
                    go: (locator: Locator, animated: boolean, cb: (ok: boolean) => void) => void;
                    goForward: (animated: boolean, cb: (ok: boolean) => void) => void;
                    goBackward: (animated: boolean, cb: (ok: boolean) => void) => void;
                };
                const originalChangeResource = guardedNav.changeResource?.bind(nav);
                const originalGo = guardedNav.go.bind(nav);
                const originalGoForward = nav.goForward.bind(nav);
                const originalGoBackward = nav.goBackward.bind(nav);

                if (originalChangeResource) {
                    guardedNav.changeResource = async (relative: number) => {
                        if (!beginChapterTransition()) return true;

                        try {
                            const ok = await originalChangeResource(relative);
                            if (!ok) clearChapterTransition();
                            return ok;
                        } catch (error) {
                            clearChapterTransition();
                            throw error;
                        }
                    };
                }

                guardedNav.go = (locator: Locator, animated: boolean, cb: (ok: boolean) => void) => {
                    const currentHref = normalizeHref(nav?.currentLocator?.href);
                    const targetHref = normalizeHref(locator.href);
                    const isCrossChapterNavigation = !!targetHref && targetHref !== currentHref;

                    if (pendingChapterTransitionRef.current) {
                        cb(true);
                        return;
                    }

                    if (isCrossChapterNavigation && !beginChapterTransition()) {
                        cb(true);
                        return;
                    }

                    try {
                        originalGo(locator, animated, (ok: boolean) => {
                            if (!ok && isCrossChapterNavigation) clearChapterTransition();
                            cb(ok);
                        });
                    } catch (error) {
                        if (isCrossChapterNavigation) clearChapterTransition();
                        throw error;
                    }
                };

                guardedNav.goForward = (animated: boolean, cb: (ok: boolean) => void) => {
                    if (pendingChapterTransitionRef.current) {
                        cb(true);
                        return;
                    }
                    originalGoForward(animated, cb);
                };

                guardedNav.goBackward = (animated: boolean, cb: (ok: boolean) => void) => {
                    if (pendingChapterTransitionRef.current) {
                        cb(true);
                        return;
                    }
                    originalGoBackward(animated, cb);
                };

                navigatorRef.current = nav;
                await nav.load();

                if (cancelled) return;
                setTocItems(manifest.toc?.items ?? []);
                void prefetchNextSpineItem(initialLocator.href);
                setIsLoading(false);
                setIsLoaded(true);
            } catch (e) {
                if (!cancelled) {
                    clearChapterTransition();
                    setLoadError(e instanceof Error ? e.message : "Failed to load book");
                    setIsLoading(false);
                }
            }
        }

        init();

        return () => {
            cancelled = true;
            activePrefetchControllerRef.current?.abort();
            activePrefetchControllerRef.current = null;
            readingOrderItemsRef.current = [];
            clearChapterTransition();
            nav?.destroy();
            navigatorRef.current = null;
        };
    }, [book.id, format]);

    // Sync theme preferences to a live navigator
    useEffect(() => {
        navigatorRef.current?.submitPreferences(
            new EpubPreferences(buildEpubPreferences(themeState)),
        );
    }, [themeState]);

    return { containerRef, navigatorRef, isLoading, isLoaded, loadError, isChapterTransitioning, percentage, tocItems };
}
