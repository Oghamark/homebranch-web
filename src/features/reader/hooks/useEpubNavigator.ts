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
import {getPositionSyncState, storePositionSyncState} from "../utils/savedPositionState";
import { deserializeLocatorFromCloud } from "@/features/reader";
import {approximateProgressLocator} from "../utils/approximateProgress";
import {resourceHref} from "../utils/annotationCodec";
import {frameResourceHref} from "../utils/annotationCodec";
import type {LocationMap, PortableLocation} from "../types/PortableLocation";
import type {CanonicalText} from "../utils/portableLocation";
import {approximateChapterPage, canonicalHref, canonicalText, capturePortableLocation, compatibleLocation, firstVisibleOffset, passageLocator, passageOffset, portableLabel, preciseLocatorMatches, precisePublicationMatches, resolvePortableTarget, textLocator, verifiedResource, withPublicationIdentity} from "../utils/portableLocation";
import ToastFactory from "@/shared/lib/toast/toast";
import {hasPreciseTarget, LogicalReadingFocus} from "../utils/logicalReadingFocus";

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
    resolveStoredLocator: (stored: Locator) => Locator;
    resolvePercentage: (percentage: number) => Locator | null;
    resolveResource: (href: string) => Locator | null;
    locationRef: React.RefObject<PortableLocation | undefined>;
    progressLabel: string;
    resolvePortable: (location: PortableLocation) => Promise<{locator: Locator; label: string; precision?: "passage"} | null>;
    validateStoredLocator: (stored: Locator) => Promise<Locator | null>;
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
    onLocationChange: (locator: Locator, percentage?: number) => void,
    enableMobileSwipeOverlay: boolean,
    resourceBaseRef: React.RefObject<string | undefined>,
    onFrameLoaded?: (wnd: Window) => void,
    onTextSelected?: () => void,
    portableLocationRef?: React.RefObject<PortableLocation | undefined>,
    savesEnabledRef?: React.RefObject<boolean>,
    restoreHoldRef?: React.RefObject<boolean>,
    onCenterTap?: () => void,
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
    const onFrameLoadedRef = useRef(onFrameLoaded);
    onFrameLoadedRef.current = onFrameLoaded;
    const onTextSelectedRef = useRef(onTextSelected);
    onTextSelectedRef.current = onTextSelected;
    const onCenterTapRef = useRef(onCenterTap);
    onCenterTapRef.current = onCenterTap;
    const selectionWindowsRef = useRef(new Set<Window>());
    const hasSelection = () => {
        const windows = new Set(selectionWindowsRef.current);
        containerRef.current?.querySelectorAll<HTMLIFrameElement>("iframe.readium-navigator-iframe").forEach(frame => {
            if (frame.contentWindow) windows.add(frame.contentWindow);
        });
        return [...windows].some(wnd => !wnd.closed && !!wnd.getSelection()?.toString());
    };
    const readingOrderItemsRef = useRef<Link[]>([]);
    const positionsRef = useRef<Locator[]>([]);
    const mapRef = useRef<LocationMap | null>(null);
    const ownLocationRef = useRef<PortableLocation | undefined>(undefined);
    const locationRef = portableLocationRef ?? ownLocationRef;
    const publicationRef = useRef<Publication | null>(null);
    const canonicalIndexesRef = useRef(new WeakMap<Document, CanonicalText>());
    const logicalFocusRef = useRef(new LogicalReadingFocus());
    const reanchorFocusRef = useRef<(() => Promise<void>) | null>(null);
    const [progressLabel, setProgressLabel] = useState("Approximate whole-book progress");
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
                publicationRef.current = publication;
                const candidate = manifestJson.locationMap as LocationMap | undefined;
                const map = candidate?.version === 1 && Array.isArray(candidate.resources) && Array.isArray(candidate.chapters) ? candidate : null;
                mapRef.current = map;

                const readingOrderItems = manifest.readingOrder?.items ?? [];
                readingOrderItemsRef.current = readingOrderItems;
                prefetchedHrefSetRef.current.clear();
                const weights = readingOrderItems.map(item => map?.resources.find(r => canonicalHref(item.href, manifest.baseURL ?? "") === r.href));
                let starts: number[];
                if (map && weights.every(Boolean)) {
                    const total = map.resources.at(-1)?.end || 1;
                    starts = weights.map(resource => resource!.start / total);
                } else {
                    // Legacy manifests have no text map. Measure text weights, never index/(n-1).
                    const lengths: number[] = [];
                    for (const item of readingOrderItems) {
                        const html = await publication.get(item).readAsString();
                        lengths.push(html ? canonicalText(new DOMParser().parseFromString(html, "text/html")).text.length : 0);
                    }
                    const total = lengths.reduce((sum, length) => sum + length + 1, -1) || 1;
                    let start = 0;
                    starts = lengths.map(length => { const result = start / total; start += length + 1; return result; });
                }
                const positions = readingOrderItems.map((item, index) =>
                    new Locator({
                        href: item.href,
                        title: item.title,
                        type: item.type ?? "application/xhtml+xml",
                        locations: new LocatorLocations({
                            position: index + 1,
                            totalProgression: starts[index],
                        }),
                    }),
                );
                positionsRef.current = positions;
                resourceBaseRef.current = manifest.baseURL;

                const savedPosition = await getSavedPosition(book.id).catch(() => null);
                const localLocator = getStoredLocator(book.id);
                const cloudLocator = savedPosition?.position
                    ? deserializeLocatorFromCloud(savedPosition.position, manifest.baseURL)
                    : undefined

                // Resolve a stored locator into a valid web locator for this client.
                // Matching is done first by full normalized href, then by filename only as a
                // fallback for cross-platform positions (e.g. Android saves bare filenames).
                // The web's position number is used so FramePoolManager can find the frame,
                // while stored progression is overlaid for within-chapter accuracy.
                const resolveStoredLocator = (stored: Locator): Locator => {
                    const filename = (href: string) => normalizeHref(href)?.split("/").pop();
                    const match =
                        positions.find(p => normalizeHref(p.href) === normalizeHref(stored.href)
                            || (!!manifest.baseURL && canonicalHref(p.href, manifest.baseURL) !== null && canonicalHref(p.href, manifest.baseURL) === canonicalHref(stored.href, manifest.baseURL))) ??
                        (!stored.text?.highlight ? positions.find(p => filename(p.href) === filename(stored.href)) : undefined);
                    if (!match) {
                        if (stored.text?.highlight) throw new Error("The saved EPUB resource cannot be verified. No guessed restoration was applied.");
                        return positions[0];
                    }
                    if (stored.text?.highlight) return new Locator({href: match.href, type: match.type, title: stored.title ?? match.title, text: stored.text, locations: stored.locations});
                    return match.copyWithLocations({
                        progression: stored.locations.progression,
                        totalProgression: stored.locations.totalProgression ?? match.locations.totalProgression,
                    });
                };

                let storedLocator = localLocator ?? cloudLocator;
                if (storedLocator?.text?.highlight) {
                    const href = canonicalHref(storedLocator.href, manifest.baseURL ?? "");
                    const link = readingOrderItems.find(item => canonicalHref(item.href, manifest.baseURL ?? "") === href);
                    const html = link ? await publication.get(link).readAsString() : undefined;
                    if (!html || !precisePublicationMatches(storedLocator, map) || !preciseLocatorMatches(new DOMParser().parseFromString(html, "text/html"), storedLocator)
                        || (!localLocator && savedPosition?.location && (!map || !compatibleLocation(map, savedPosition.location)))) {
                        ToastFactory({message: "Saved passage could not be verified. Only approximate resource progress is available.", type: "warning"});
                        storedLocator = new Locator({href: storedLocator.href, type: storedLocator.type, title: storedLocator.title,
                            locations: new LocatorLocations({progression: storedLocator.locations.progression, totalProgression: storedLocator.locations.totalProgression})});
                    }
                }
                const initialLocator: Locator = storedLocator
                    ? resolveStoredLocator(storedLocator)
                    : positions[0];

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
                        if (wnd.getSelection()?.toString()) {
                            mobileSwipeStartXRef.current = null;
                            retreatSwipeOverlay();
                            return;
                        }
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
                        if (wnd.getSelection()?.toString()) {
                            mobileSwipeStartXRef.current = null;
                            mobileSwipeBoundaryDirectionRef.current = null;
                            retreatSwipeOverlay();
                            return;
                        }
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

                const restoreInputWindows = new WeakSet<Window>();
                const attachRestoreInput = (wnd: Window) => {
                    if (restoreInputWindows.has(wnd)) return;
                    restoreInputWindows.add(wnd);
                    const resumeForInput = (event: Event) => {
                        if (!event.isTrusted || wnd.getSelection()?.toString()) return;
                        if (event.type === "keydown" && !["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight", "PageDown", "PageUp", " "].includes((event as KeyboardEvent).key)) return;
                        resumeAfterRestore();
                    };
                    for (const name of ["wheel", "touchmove", "keydown"]) wnd.addEventListener(name, resumeForInput, {passive: true});
                    frameSwipeCleanupRef.current.push(() => {
                        for (const name of ["wheel", "touchmove", "keydown"]) wnd.removeEventListener(name, resumeForInput);
                    });
                };
                const listeners: EpubNavigatorListeners = {
                    frameLoaded: (wnd: Window) => {
                        if (cancelled) return;
                        selectionWindowsRef.current.add(wnd);
                        attachRestoreInput(wnd);
                        const unload = () => selectionWindowsRef.current.delete(wnd);
                        wnd.addEventListener("unload", unload, {once: true});
                        frameSwipeCleanupRef.current.push(() => wnd.removeEventListener("unload", unload));
                        onFrameLoadedRef.current?.(wnd);
                        attachMobileSwipeTracking(wnd);
                        clearChapterTransition();
                    },
                    positionChanged: (locator: Locator) => {
                        if (cancelled) return;
                        clearChapterTransition();
                        void prefetchNextSpineItem(locator.href);
                        const title = locator.title?.trim() || findTitleForHref(locator.href);
                        let normalizedLocator = title
                            ? new Locator({
                                href: locator.href,
                                title,
                                text: locator.text,
                                locations: locator.locations,
                                type: locator.type,
                            })
                            : locator;
                        const resourceIndex = positions.findIndex(p => normalizeHref(p.href) === normalizeHref(locator.href));
                        if (resourceIndex >= 0) {
                            const start = starts[resourceIndex] ?? 0;
                            const end = starts[resourceIndex + 1] ?? 1;
                            normalizedLocator = new Locator({href: normalizedLocator.href, type: normalizedLocator.type, title: normalizedLocator.title,
                                text: normalizedLocator.text, locations: new LocatorLocations({
                                    progression: locator.locations.progression,
                                    totalProgression: start + (end - start) * (locator.locations.progression ?? 0),
                                    otherLocations: locator.locations.otherLocations,
                                })});
                        }
                        if (!logicalFocusRef.current.locator) locationRef.current = undefined;
                        const base = resourceBaseRef.current;
                        const map = mapRef.current;
                        let chapterPage: string | null = null;
                        let capturedPoint = false;
                        containerRef.current?.querySelectorAll<HTMLIFrameElement>("iframe.readium-navigator-iframe").forEach(frame => {
                            if (frame.contentWindow?.document.body) attachRestoreInput(frame.contentWindow);
                        });
                        if (base && map) {
                            const href = canonicalHref(locator.href, base);
                            const resource = map.resources.find(r => r.href === href);
                            const frames = containerRef.current?.querySelectorAll<HTMLIFrameElement>("iframe.readium-navigator-iframe") ?? [];
                            for (const frame of frames) {
                                const wnd = frame.contentWindow;
                                if (!wnd || !resource || !frame.getBoundingClientRect().width
                                    || decodeURIComponent(frameResourceHref(wnd, base) ?? "") !== href) continue;
                                let index = canonicalIndexesRef.current.get(wnd.document);
                                if (!index) {
                                    index = canonicalText(wnd.document);
                                    canonicalIndexesRef.current.set(wnd.document, index);
                                }
                                if (!verifiedResource(map, resource, index, false)) continue;
                                const offset = logicalFocusRef.current.locator
                                    ? logicalFocusRef.current.capture(wnd, index, map, resource.href)
                                    : firstVisibleOffset(wnd, index);
                                if (offset === null) continue;
                                capturedPoint = true;
                                locationRef.current = capturePortableLocation(map, resource.href, offset, index) ?? undefined;
                                const sectionVerified = verifiedResource(map, resource, index);
                                if (!sectionVerified && locationRef.current) {
                                    delete locationRef.current.chapterId;
                                    delete locationRef.current.chapterProgression;
                                }
                                if (logicalFocusRef.current.locator && !capturedPoint) return;
                                if (sectionVerified) chapterPage = approximateChapterPage(wnd, index, map, resource.href, offset, themeStateRef.current.scroll);
                                const precise = textLocator(normalizedLocator, index, offset);
                                if (precise) normalizedLocator = withPublicationIdentity(new Locator({href: precise.href, type: precise.type, title: precise.title,
                                    text: precise.text, locations: new LocatorLocations({
                                        progression: locator.locations.progression,
                                        totalProgression: (resource.start + offset) / (map.resources.at(-1)?.end || 1),
                                        otherLocations: precise.locations.otherLocations,
                                    })}), map);
                                break;
                            }
                        }
                        const label = portableLabel(map, locationRef.current) ?? "Approximate whole-book progress";
                        setProgressLabel(chapterPage ? `${label} · ${chapterPage}` : label);
                        const progress = normalizedLocator.locations?.totalProgression;
                        if (progress !== undefined) {
                            setPercentage(progress);
                            const userId = sessionStorage.getItem("user_id");
                            if (userId) storeProgress(userId, book.id, progress);
                        }
                        onLocationChangeRef.current(normalizedLocator, progress);
                    },
                    tap: (e) => {
                        if (hasSelection()) return true;
                        const onCenter = onCenterTapRef.current;
                        if (!onCenter || e.interactiveElement != null) return e.interactiveElement == null;
                        const width = container?.clientWidth || window.innerWidth;
                        const ratio = e.x / window.devicePixelRatio / width;
                        if (ratio < 0.3) nav?.goBackward(false, () => {});
                        else if (ratio > 0.7) nav?.goForward(false, () => {});
                        else onCenter();
                        return true;
                    },
                    click: (e) => hasSelection() || e.interactiveElement == null,
                    zoom: () => {},
                    miscPointer: () => {},
                    scroll: () => {},
                    customEvent: () => {},
                    handleLocator: () => false,
                    textSelected: () => { onTextSelectedRef.current?.(); },
                    contentProtection: () => {},
                    contextMenu: () => {},
                    peripheral: (data) => {
                        if (hasSelection()) return;
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
                let navigationVersion = 0;
                const resumeAfterRestore = () => {
                    navigationVersion++;
                    logicalFocusRef.current.clear();
                    if (!restoreHoldRef?.current) return;
                    restoreHoldRef.current = false;
                    if (savesEnabledRef) savesEnabledRef.current = true;
                    storePositionSyncState(book.id, {...getPositionSyncState(book.id), restored: false});
                };
                const pauseForUnresolvedTarget = () => {
                    if (savesEnabledRef) savesEnabledRef.current = false;
                    if (restoreHoldRef) restoreHoldRef.current = true;
                    storePositionSyncState(book.id, {...getPositionSyncState(book.id), restored: true});
                };

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
                        cb(false);
                        return;
                    }
                    resumeAfterRestore();
                    const precise = hasPreciseTarget(locator) && !!mapRef.current && !!resourceBaseRef.current;
                    const navigation = navigationVersion;
                    const previousSaves = savesEnabledRef?.current;
                    if (precise && savesEnabledRef) savesEnabledRef.current = false;

                    if (isCrossChapterNavigation && !beginChapterTransition()) {
                        cb(true);
                        return;
                    }

                    try {
                        originalGo(locator, animated, async (ok: boolean) => {
                            if (cancelled) return;
                            if (navigation !== navigationVersion) { cb(false); return; }
                            const map = mapRef.current, base = resourceBaseRef.current;
                            if (ok && precise) ok = !!map && !!base && await logicalFocusRef.current.select(locator, container!, map, base,
                                () => new Promise(resolve => originalGo(locator, false, resolve)));
                            if (cancelled) return;
                            if (navigation !== navigationVersion) { cb(false); return; }
                            if (precise && ok && savesEnabledRef && previousSaves !== undefined) savesEnabledRef.current = previousSaves;
                            if (ok) listeners.positionChanged(nav!.currentLocator);
                            else if (precise) {
                                pauseForUnresolvedTarget();
                                ToastFactory({message: "The selected passage is not visibly resolved. No logical position was accepted; automatic saves remain paused.", type: "warning"});
                            }
                            if (!ok && isCrossChapterNavigation) clearChapterTransition();
                            cb(ok);
                        });
                    } catch (error) {
                        if (precise) pauseForUnresolvedTarget();
                        if (isCrossChapterNavigation) clearChapterTransition();
                        throw error;
                    }
                };

                guardedNav.goForward = (animated: boolean, cb: (ok: boolean) => void) => {
                    if (pendingChapterTransitionRef.current) {
                        cb(true);
                        return;
                    }
                    resumeAfterRestore();
                    originalGoForward(animated, cb);
                };

                guardedNav.goBackward = (animated: boolean, cb: (ok: boolean) => void) => {
                    if (pendingChapterTransitionRef.current) {
                        cb(true);
                        return;
                    }
                    resumeAfterRestore();
                    originalGoBackward(animated, cb);
                };

                navigatorRef.current = nav;
                await nav.load();
                let reanchoring = false;
                let reanchorAgain = false;
                const reanchor = async () => {
                    const selected = logicalFocusRef.current.locator;
                    if (!selected || cancelled) return;
                    if (reanchoring) { reanchorAgain = true; return; }
                    reanchoring = true;
                    const previousSaves = savesEnabledRef?.current;
                    const navigation = navigationVersion;
                    if (savesEnabledRef) savesEnabledRef.current = false;
                    try {
                        const ok = await new Promise<boolean>(resolve => originalGo(selected, false, resolve));
                        if (cancelled || navigation !== navigationVersion || logicalFocusRef.current.locator !== selected) return;
                        const visible = ok && !!mapRef.current && !!resourceBaseRef.current
                            && await logicalFocusRef.current.select(selected, container!, mapRef.current, resourceBaseRef.current,
                                () => new Promise(resolve => originalGo(selected, false, resolve)));
                        if (cancelled || navigation !== navigationVersion) return;
                        if (!visible) {
                            pauseForUnresolvedTarget();
                            ToastFactory({message: "The selected passage could not be restored after the layout changed. Automatic saves remain paused until you choose another reading point.", type: "warning"});
                            return;
                        }
                        if (savesEnabledRef && previousSaves !== undefined) savesEnabledRef.current = previousSaves;
                        listeners.positionChanged(nav!.currentLocator);
                    } catch {
                        pauseForUnresolvedTarget();
                        ToastFactory({message: "Unable to visibly restore the selected passage after the layout changed. Automatic saves remain paused.", type: "warning"});
                    } finally {
                        reanchoring = false;
                        if (reanchorAgain) { reanchorAgain = false; void reanchor(); }
                    }
                };
                reanchorFocusRef.current = reanchor;
                if (map && manifest.baseURL && hasPreciseTarget(initialLocator)) {
                    const ok = await new Promise<boolean>(resolve => originalGo(initialLocator, false, resolve));
                    if (ok && await logicalFocusRef.current.select(initialLocator, container!, map, manifest.baseURL ?? "",
                        () => new Promise(resolve => originalGo(initialLocator, false, resolve)))) {
                        listeners.positionChanged(nav.currentLocator);
                    } else {
                        pauseForUnresolvedTarget();
                        ToastFactory({message: "The saved passage is not visibly resolved. Automatic saves remain paused until you choose another reading point.", type: "warning"});
                    }
                }
                let resizeTimer: ReturnType<typeof setTimeout> | null = null;
                const resizeObserver = new ResizeObserver(() => {
                    if (resizeTimer) clearTimeout(resizeTimer);
                    resizeTimer = setTimeout(() => { void reanchor(); }, 120);
                });
                resizeObserver.observe(container!);
                frameSwipeCleanupRef.current.push(() => {
                    resizeObserver.disconnect();
                    if (resizeTimer) clearTimeout(resizeTimer);
                });

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
            mapRef.current = null;
            publicationRef.current = null;
            locationRef.current = undefined;
            canonicalIndexesRef.current = new WeakMap();
            logicalFocusRef.current.clear();
            reanchorFocusRef.current = null;
            tocItemsRef.current = [];
            clearPendingSwipeDirectionTimeout();
            pendingSwipeDirectionRef.current = null;
            clearOverlayHideTimeout();
            setMobileSwipeOverlay(null);
            clearChapterTransition();
            nav?.destroy();
            navigatorRef.current = null;
            selectionWindowsRef.current.clear();
        };
    }, [book.id, format]);

    // Sync theme preferences to a live navigator
    useEffect(() => {
        const preferences = navigatorRef.current?.submitPreferences(
            new EpubPreferences(buildEpubPreferences(themeState)),
        );
        if (preferences) void Promise.resolve(preferences).then(() => reanchorFocusRef.current?.());
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
        locationRef,
        progressLabel,
        validateStoredLocator: async (stored: Locator) => {
            if (!stored.text?.highlight) return stored;
            const base = resourceBaseRef.current, publication = publicationRef.current;
            if (!base || !publication || !precisePublicationMatches(stored, mapRef.current)) return null;
            const href = canonicalHref(stored.href, base);
            const link = readingOrderItemsRef.current.find(item => canonicalHref(item.href, base) === href);
            if (!link) return null;
            const html = await publication.get(link).readAsString();
            return html && preciseLocatorMatches(new DOMParser().parseFromString(html, "text/html"), stored) ? stored : null;
        },
        resolvePortable: async (location: PortableLocation) => {
            const map = mapRef.current, base = resourceBaseRef.current, publication = publicationRef.current;
            if (!map || !base || !publication || !compatibleLocation(map, location)) return null;
            let target = resolvePortableTarget(map, location);
            if (!target) throw new Error("Invalid saved chapter coordinates");
            const loadTarget = async (href: string) => {
                const position = positionsRef.current.find(p => canonicalHref(p.href, base) === href);
                const link = readingOrderItemsRef.current.find(p => canonicalHref(p.href, base) === href);
                const resource = map.resources.find(r => r.href === href);
                if (!position || !link || !resource) throw new Error("Saved resource is not in this publication");
                const html = await publication.get(link).readAsString();
                if (!html) throw new Error("Saved resource text is unavailable");
                const index = canonicalText(new DOMParser().parseFromString(html, "text/html"));
                if (!verifiedResource(map, resource, index, false)) throw new Error("Saved resource boundaries cannot be verified");
                return {position, resource, index};
            };
            const passageSource = location.passage ? await loadTarget(location.href) : undefined;
            if (location.passage && passageSource) {
                const source = passageSource;
                const section = map.chapters.find(ch => ch.id === location.chapterId);
                const boundary = section && (section.href === source.resource.href ? source : await loadTarget(section.href));
                const start = Math.max(0, (section?.start ?? source.resource.start) - source.resource.start);
                const end = Math.min(source.index.text.length, (section?.end ?? source.resource.end) - source.resource.start);
                const verified = verifiedResource(map, source.resource, source.index)
                    && (!boundary || verifiedResource(map, boundary.resource, boundary.index));
                const offset = verified ? passageOffset(source.index.text, location.passage, start, end) : null;
                const precise = offset === null ? null : passageLocator(source.position, source.index, offset);
                if (precise) return {locator: withPublicationIdentity(precise, map),
                    label: "Verified saved passage", precision: "passage" as const};
            }
            let loaded = passageSource?.resource.href === target.href ? passageSource : await loadTarget(target.href);
            let chapter = map.chapters.find(ch => ch.id === location.chapterId);
            if (chapter) {
                const boundary = chapter.href === loaded.resource.href ? loaded : await loadTarget(chapter.href);
                if (!verifiedResource(map, boundary.resource, boundary.index)) {
                    target = resolvePortableTarget(map, {...location, chapterId: undefined, chapterProgression: undefined});
                    if (!target) throw new Error("Saved resource fallback is invalid");
                    target.label = `Chapter boundary unresolved. ${target.label}`;
                    loaded = await loadTarget(target.href);
                    chapter = undefined;
                }
            }
            const {position, resource, index} = loaded;
            const locator = textLocator(position, index, target.offset, chapter
                ? {start: Math.max(0, chapter.start - resource.start), end: Math.min(index.text.length, chapter.end - resource.start)}
                : undefined);
            if (!locator) throw new Error("Saved chapter text is ambiguous");
            return {locator: withPublicationIdentity(locator, map),
                label: `${location.passage ? "Passage could not be verified. " : ""}${target.label}`};
        },
        resolvePercentage: (value: number) => approximateProgressLocator(positionsRef.current, value),
        resolveResource: (href: string) => {
            const base = resourceBaseRef.current;
            if (!base) return null;
            const path = resourceHref(href, base);
            return path ? positionsRef.current.find(position => resourceHref(position.href, base) === path) ?? null : null;
        },
        resolveStoredLocator: (stored: Locator): Locator => {
            const positions = positionsRef.current;
            if (!positions.length) return stored;
            const filename = (href: string) => normalizeHref(href)?.split("/").pop();
            const base = resourceBaseRef.current;
            const match =
                positions.find(p => normalizeHref(p.href) === normalizeHref(stored.href)
                    || (!!base && canonicalHref(p.href, base) !== null && canonicalHref(p.href, base) === canonicalHref(stored.href, base))) ??
                (!stored.text?.highlight ? positions.find(p => filename(p.href) === filename(stored.href)) : undefined);
            if (!match) return stored;
            if (stored.text?.highlight) return new Locator({href: match.href, type: match.type, title: stored.title ?? match.title, text: stored.text, locations: stored.locations});
            return match.copyWithLocations({
                progression: stored.locations.progression,
                totalProgression: stored.locations.totalProgression ?? match.locations.totalProgression,
            });
        },
    };
}
