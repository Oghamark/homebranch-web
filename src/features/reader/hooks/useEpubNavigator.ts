import React, { useEffect, useRef, useState } from "react";
import { EpubNavigator, EpubPreferences } from "@readium/navigator";
import type { EpubNavigatorListeners } from "@readium/navigator";
import { HttpFetcher, Link, Locator, LocatorLocations, Manifest, Publication } from "@readium/shared";
import { axiosInstance } from "@/shared/api/axios";
import { getStoredProgress, storeProgress } from "@/features/reader";
import { buildEpubPreferences } from "@/features/reader";
import type { ReaderThemeState } from "../types/ReaderTheme";
import type { BookModel } from "@/entities/book/model/BookModel";
import type {BookFormatType} from "@/entities/book/model/bookFormats";
import { getSavedPosition } from "../api/savedPositionApi";
import { getStoredLocator } from "@/features/reader";
import { deserializeLocatorFromCloud } from "@/features/reader";

const CHAPTER_TRANSITION_TIMEOUT_MS = 8000;
const MOBILE_BOUNDARY_SWIPE_TRIGGER_RATIO = 0.12;
const MOBILE_BOUNDARY_SWIPE_TRIGGER_PX = 32;

export interface UseEpubNavigatorResult {
    containerRef: React.RefObject<HTMLDivElement | null>;
    navigatorRef: React.RefObject<EpubNavigator | null>;
    isLoading: boolean;
    isLoaded: boolean;
    loadError: string | null;
    isChapterTransitioning: boolean;
    mobileSwipeOverlay: MobileSwipeOverlayState | null;
    percentage: number | undefined;
    tocItems: Link[];
}

export type MobileSwipeDirection = "forward" | "backward";

export interface MobileSwipeOverlayState {
    direction: MobileSwipeDirection;
    progress: number;
    isLoading: boolean;
    isTracking: boolean;
}

export function useEpubNavigator(
    book: BookModel,
    format: BookFormatType,
    themeState: ReaderThemeState,
    onLocationChange: (locator: Locator) => void,
    enableMobileSwipeOverlay: boolean,
): UseEpubNavigatorResult {
    function deserializeLinks(raw: unknown): Link[] {
        if (!Array.isArray(raw)) return [];
        return raw
            .map((item) => Link.deserialize(item))
            .filter((item): item is Link => item !== undefined);
    }

    function getTocItems(manifest: Manifest, manifestJson: unknown): Link[] {
        const tocFromManifest = manifest.toc?.items ?? [];
        if (tocFromManifest.length > 0) return tocFromManifest;

        const manifestRecord =
            manifestJson && typeof manifestJson === "object"
                ? (manifestJson as Record<string, unknown>)
                : null;

        const tocFromJson = deserializeLinks(manifestRecord?.toc);
        if (tocFromJson.length > 0) return tocFromJson;

        const tocFromTableOfContents = deserializeLinks(manifestRecord?.tableOfContents);
        if (tocFromTableOfContents.length > 0) return tocFromTableOfContents;

        const navigationRecord =
            manifestRecord?.navigation && typeof manifestRecord.navigation === "object"
                ? (manifestRecord.navigation as Record<string, unknown>)
                : null;
        const tocFromNavigation = deserializeLinks(navigationRecord?.toc);
        if (tocFromNavigation.length > 0) return tocFromNavigation;
        const tocFromNavigationTableOfContents = deserializeLinks(navigationRecord?.tableOfContents);
        if (tocFromNavigationTableOfContents.length > 0) return tocFromNavigationTableOfContents;

        return manifest.linkWithRel("contents")?.children?.items ?? [];
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
    const frameSwipeCleanupRef = useRef<Array<() => void>>([]);
    const trackedSwipeWindowsRef = useRef(new WeakSet<Window>());
    const mobileSwipeStartXRef = useRef<number | null>(null);
    const mobileSwipeDistanceRef = useRef(0);
    const mobileSwipeDirectionRef = useRef<MobileSwipeDirection | null>(null);
    const mobileSwipeBoundaryDirectionRef = useRef<MobileSwipeDirection | null>(null);
    const pendingSwipeDirectionRef = useRef<MobileSwipeDirection | null>(null);
    const pendingSwipeDirectionTimeoutRef = useRef<number | null>(null);
    const overlayHideTimeoutRef = useRef<number | null>(null);
    const enableMobileSwipeOverlayRef = useRef(enableMobileSwipeOverlay);
    enableMobileSwipeOverlayRef.current = enableMobileSwipeOverlay;

    const [isLoading, setIsLoading] = useState(true);
    const [isLoaded, setIsLoaded] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [isChapterTransitioning, setIsChapterTransitioning] = useState(false);
    const [mobileSwipeOverlay, setMobileSwipeOverlay] = useState<MobileSwipeOverlayState | null>(null);
    const [tocItems, setTocItems] = useState<Link[]>([]);
    const tocItemsRef = useRef<Link[]>([]);
    const [percentage, setPercentage] = useState<number | undefined>(() => {
        const userId = sessionStorage.getItem("user_id");
        if (!userId) return undefined;
        return getStoredProgress(userId, book.id);
    });

    function normalizeHref(href?: string | null): string | null {
        if (!href) return null;
        return href.split("#")[0] ?? null;
    }

    function findTitleForHref(href?: string | null): string | undefined {
        const normalizedHref = normalizeHref(href);
        if (!normalizedHref) return undefined;

        const readingOrderTitle = readingOrderItemsRef.current.find(
            (item) => normalizeHref(item.href) === normalizedHref,
        )?.title?.trim();
        if (readingOrderTitle) return readingOrderTitle;

        const stack = [...tocItemsRef.current];
        while (stack.length > 0) {
            const item = stack.shift();
            if (!item) continue;
            if (normalizeHref(item.href) === normalizedHref && item.title?.trim()) {
                return item.title.trim();
            }
            if (item.children?.items?.length) {
                stack.push(...item.children.items);
            }
        }

        return undefined;
    }

    function clearTransitionTimeout() {
        if (transitionTimeoutRef.current !== null) {
            window.clearTimeout(transitionTimeoutRef.current);
            transitionTimeoutRef.current = null;
        }
    }

    function clearOverlayHideTimeout() {
        if (overlayHideTimeoutRef.current !== null) {
            window.clearTimeout(overlayHideTimeoutRef.current);
            overlayHideTimeoutRef.current = null;
        }
    }

    function clearPendingSwipeDirectionTimeout() {
        if (pendingSwipeDirectionTimeoutRef.current !== null) {
            window.clearTimeout(pendingSwipeDirectionTimeoutRef.current);
            pendingSwipeDirectionTimeoutRef.current = null;
        }
    }

    function scheduleSwipeOverlayHide() {
        clearOverlayHideTimeout();
        overlayHideTimeoutRef.current = window.setTimeout(() => {
            setMobileSwipeOverlay(null);
        }, 180);
    }

    function retreatSwipeOverlay() {
        clearOverlayHideTimeout();
        let hasOverlay = false;
        setMobileSwipeOverlay((prev) => {
            if (!prev) return prev;
            hasOverlay = true;
            return {
                ...prev,
                progress: 0,
                isLoading: false,
                isTracking: false,
            };
        });
        if (hasOverlay) scheduleSwipeOverlayHide();
    }

    function clearChapterTransition(retreatOverlay = true) {
        pendingChapterTransitionRef.current = false;
        setIsChapterTransitioning(false);
        clearTransitionTimeout();
        if (retreatOverlay && enableMobileSwipeOverlayRef.current) retreatSwipeOverlay();
    }

    function beginChapterTransition(direction?: MobileSwipeDirection): boolean {
        if (pendingChapterTransitionRef.current) return false;
        pendingChapterTransitionRef.current = true;
        setIsChapterTransitioning(true);
        if (
            enableMobileSwipeOverlayRef.current &&
            direction &&
            pendingSwipeDirectionRef.current === direction
        ) {
            clearPendingSwipeDirectionTimeout();
            pendingSwipeDirectionRef.current = null;
            clearOverlayHideTimeout();
            setMobileSwipeOverlay({
                direction,
                progress: 1,
                isLoading: true,
                isTracking: false,
            });
        }

        // Fallback so the reader never gets stuck if Readium doesn't emit a load/update signal.
        clearTransitionTimeout();
        transitionTimeoutRef.current = window.setTimeout(() => {
            clearChapterTransition(false);
        }, CHAPTER_TRANSITION_TIMEOUT_MS);

        return true;
    }

    function isChapterBoundaryDirection(direction: MobileSwipeDirection): boolean {
        const nav = navigatorRef.current;
        if (!nav) return false;
        if (direction === "forward") return nav.canGoForward && nav.isScrollEnd;
        return nav.canGoBackward && nav.isScrollStart;
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
                        title: item.title,
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
                const localLocator = getStoredLocator(book.id);
                const cloudLocator = savedPosition?.position ? deserializeLocatorFromCloud(savedPosition.position) : undefined
                const initialLocator: Locator =
                    localLocator ??
                    cloudLocator ??
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

                function attachMobileSwipeTracking(wnd: Window) {
                    if (!enableMobileSwipeOverlayRef.current || trackedSwipeWindowsRef.current.has(wnd)) return;
                    trackedSwipeWindowsRef.current.add(wnd);

                    const touchStart = (event: TouchEvent) => {
                        if (event.touches.length !== 1) return;
                        clearOverlayHideTimeout();
                        clearPendingSwipeDirectionTimeout();
                        pendingSwipeDirectionRef.current = null;
                        mobileSwipeStartXRef.current = event.touches[0]?.clientX ?? null;
                        mobileSwipeDistanceRef.current = 0;
                        mobileSwipeDirectionRef.current = null;
                        mobileSwipeBoundaryDirectionRef.current = null;
                    };

                    const touchMove = (event: TouchEvent) => {
                        if (mobileSwipeStartXRef.current === null || event.touches.length !== 1) return;

                        const currentX = event.touches[0]?.clientX;
                        if (currentX === undefined) return;
                        const deltaX = mobileSwipeStartXRef.current - currentX;
                        const distance = Math.abs(deltaX);
                        if (distance < 2) return;

                        const direction: MobileSwipeDirection = deltaX >= 0 ? "forward" : "backward";
                        mobileSwipeDirectionRef.current = direction;
                        mobileSwipeDistanceRef.current = distance;

                        if (!isChapterBoundaryDirection(direction)) {
                            mobileSwipeBoundaryDirectionRef.current = null;
                            retreatSwipeOverlay();
                            return;
                        }

                        mobileSwipeBoundaryDirectionRef.current = direction;
                        event.preventDefault();
                        event.stopPropagation();
                        const progress = Math.min(distance / Math.max(wnd.innerWidth * 0.35, 1), 1);
                        setMobileSwipeOverlay({
                            direction,
                            progress,
                            isLoading: false,
                            isTracking: true,
                        });
                    };

                    const touchEnd = () => {
                        const direction = mobileSwipeBoundaryDirectionRef.current;
                        const swipeDistance = mobileSwipeDistanceRef.current;
                        mobileSwipeStartXRef.current = null;
                        mobileSwipeDistanceRef.current = 0;
                        mobileSwipeDirectionRef.current = null;
                        mobileSwipeBoundaryDirectionRef.current = null;

                        if (!direction) {
                            retreatSwipeOverlay();
                            return;
                        }

                        const swipeThreshold = Math.max(wnd.innerWidth * MOBILE_BOUNDARY_SWIPE_TRIGGER_RATIO, MOBILE_BOUNDARY_SWIPE_TRIGGER_PX);
                        if (swipeDistance < swipeThreshold || !isChapterBoundaryDirection(direction)) {
                            retreatSwipeOverlay();
                            return;
                        }

                        pendingSwipeDirectionRef.current = direction;
                        clearPendingSwipeDirectionTimeout();
                        pendingSwipeDirectionTimeoutRef.current = window.setTimeout(() => {
                            pendingSwipeDirectionRef.current = null;
                        }, 500);
                        clearOverlayHideTimeout();
                        setMobileSwipeOverlay({
                            direction,
                            progress: 1,
                            isLoading: false,
                            isTracking: false,
                        });
                        if (pendingChapterTransitionRef.current) return;
                        if (direction === "forward") {
                            nav?.goForward(false, (ok) => {
                                if (!ok) clearChapterTransition();
                            });
                            return;
                        }
                        nav?.goBackward(false, (ok) => {
                            if (!ok) clearChapterTransition();
                        });
                    };

                    wnd.addEventListener("touchstart", touchStart, { passive: true });
                    wnd.addEventListener("touchmove", touchMove, { passive: false, capture: true });
                    wnd.addEventListener("touchend", touchEnd, { passive: true });
                    wnd.addEventListener("touchcancel", touchEnd, { passive: true });

                    frameSwipeCleanupRef.current.push(() => {
                        wnd.removeEventListener("touchstart", touchStart);
                        wnd.removeEventListener("touchmove", touchMove, true);
                        wnd.removeEventListener("touchend", touchEnd);
                        wnd.removeEventListener("touchcancel", touchEnd);
                    });
                }

                const listeners: EpubNavigatorListeners = {
                    frameLoaded: (wnd: Window) => {
                        if (cancelled) return;
                        attachMobileSwipeTracking(wnd);
                        clearChapterTransition();
                    },
                    positionChanged: (locator: Locator) => {
                        if (cancelled) return;
                        clearChapterTransition();
                        void prefetchNextSpineItem(locator.href);
                        const title = locator.title?.trim() || findTitleForHref(locator.href);
                        const normalizedLocator = title
                            ? new Locator({
                                href: locator.href,
                                title,
                                text: locator.text,
                                locations: locator.locations,
                                type: locator.type,
                            })
                            : locator;
                        const progress = normalizedLocator.locations?.totalProgression;
                        if (progress !== undefined) {
                            setPercentage(progress);
                            const userId = sessionStorage.getItem("user_id");
                            if (userId) storeProgress(userId, book.id, progress);
                        }
                        onLocationChangeRef.current(normalizedLocator);
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
                        const direction = relative > 0 ? "forward" : "backward";
                        if (!beginChapterTransition(direction)) return true;

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
                const nextTocItems = getTocItems(manifest, manifestJson);
                tocItemsRef.current = nextTocItems;
                setTocItems(nextTocItems);
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
            frameSwipeCleanupRef.current.forEach((cleanup) => cleanup());
            frameSwipeCleanupRef.current = [];
            readingOrderItemsRef.current = [];
            tocItemsRef.current = [];
            clearPendingSwipeDirectionTimeout();
            pendingSwipeDirectionRef.current = null;
            clearOverlayHideTimeout();
            setMobileSwipeOverlay(null);
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

    return {
        containerRef,
        navigatorRef,
        isLoading,
        isLoaded,
        loadError,
        isChapterTransitioning,
        mobileSwipeOverlay,
        percentage,
        tocItems,
    };
}
