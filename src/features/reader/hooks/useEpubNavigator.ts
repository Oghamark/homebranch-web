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

export interface UseEpubNavigatorResult {
    containerRef: React.RefObject<HTMLDivElement | null>;
    navigatorRef: React.RefObject<EpubNavigator | null>;
    isLoading: boolean;
    isLoaded: boolean;
    loadError: string | null;
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

    const [isLoading, setIsLoading] = useState(true);
    const [isLoaded, setIsLoaded] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [tocItems, setTocItems] = useState<Link[]>([]);
    const [percentage, setPercentage] = useState<number | undefined>(() => {
        const userId = sessionStorage.getItem("user_id");
        if (!userId) return undefined;
        return getStoredProgress(userId, book.id);
    });

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

                const listeners: EpubNavigatorListeners = {
                    frameLoaded: () => {},
                    positionChanged: (locator: Locator) => {
                        if (cancelled) return;
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
                navigatorRef.current = nav;
                await nav.load();

                if (cancelled) return;
                setTocItems(manifest.toc?.items ?? []);
                setIsLoading(false);
                setIsLoaded(true);
            } catch (e) {
                if (!cancelled) {
                    setLoadError(e instanceof Error ? e.message : "Failed to load book");
                    setIsLoading(false);
                }
            }
        }

        init();

        return () => {
            cancelled = true;
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

    return { containerRef, navigatorRef, isLoading, isLoaded, loadError, percentage, tocItems };
}
