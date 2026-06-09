import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {Box, Flex, IconButton, Input, Text, useMediaQuery} from "@chakra-ui/react";
import {Document, Page, pdfjs} from "react-pdf";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?worker&url";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import {LuChevronLeft, LuChevronRight, LuList, LuMinus, LuPlus, LuX} from "react-icons/lu";
import type {BookModel} from "@/entities/book";
import type {BookFormatType} from "@/entities/book/model/bookFormats";
import {config} from "@/shared";
import {useAppSelector} from "@/app/hooks";
import {getThemeColors} from "../types/ReaderTheme";
import {useDeviceName} from "../hooks/useDeviceName";
import {useSavePositionSync} from "../hooks/useSavePositionSync";
import {getSavedPosition} from "../api/savedPositionApi";
import {getStoredProgress, storeProgress} from "../utils/readingProgress";
import {getApproximatePdfPage, getExactFormatPosition, getResumeFormatPosition, getStoredPdfPage} from "../utils/savedPositionState";
import {useNavigate} from "react-router";
import {ReaderProgressBar} from "./ReaderProgressBar";
import {ReaderLoadingState} from "./ReaderLoadingState";
import {ReaderSettingsMenu} from "./ReaderSettingsMenu";
import {ReaderToc, type ReaderTocItem} from "./ReaderToc";
import {JumpBackButton} from "./JumpBackButton";

const KEYBOARD_HINT_KEY = "pdf-reader-keyboard-hint-shown";

type PdfOutlineItem = {
    title?: string;
    dest?: string | unknown[] | null;
    items?: PdfOutlineItem[];
};

type PdfDocumentLike = {
    numPages: number;
    getOutline(): Promise<PdfOutlineItem[] | null>;
    getDestination(destination: string): Promise<unknown[] | null>;
    getPageIndex(reference: unknown): Promise<number>;
};

type PdfTocItem = ReaderTocItem & {
    pageNumber?: number;
};

pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;

interface PdfReaderProps {
    book: BookModel;
    format: BookFormatType;
}

type PdfSavedPosition = {
    kind: "pdf";
    page: number;
};

function parsePdfSavedPosition(position?: string | null): number | undefined {
    if (!position) return undefined;

    const numericPosition = Number(position);
    if (Number.isInteger(numericPosition) && numericPosition > 0) {
        return numericPosition;
    }

    try {
        const parsed = JSON.parse(position) as Partial<PdfSavedPosition>;
        if (parsed.kind === "pdf" && Number.isInteger(parsed.page) && parsed.page! > 0) {
            return parsed.page;
        }
    } catch {
        return undefined;
    }

    return undefined;
}

function getPdfProgress(page: number, totalPages: number): number {
    if (totalPages <= 1) return 0;
    return Math.min(1, Math.max(0, (page - 1) / (totalPages - 1)));
}

async function resolvePdfDestinationPage(pdf: PdfDocumentLike, destination?: string | unknown[] | null): Promise<number | undefined> {
    if (!destination) return undefined;

    const explicitDestination = typeof destination === "string"
        ? await pdf.getDestination(destination)
        : destination;

    if (!Array.isArray(explicitDestination) || explicitDestination.length === 0) {
        return undefined;
    }

    const pageReference = explicitDestination[0];
    if (typeof pageReference === "number") {
        return pageReference + 1;
    }

    if (!pageReference) {
        return undefined;
    }

    try {
        return await pdf.getPageIndex(pageReference) + 1;
    } catch {
        return undefined;
    }
}

async function buildPdfToc(pdf: PdfDocumentLike): Promise<PdfTocItem[]> {
    const outline = await pdf.getOutline();
    if (!outline?.length) return [];

    async function mapItem(item: PdfOutlineItem, path: string): Promise<PdfTocItem> {
        const pageNumber = await resolvePdfDestinationPage(pdf, item.dest);
        const children = await Promise.all((item.items ?? []).map((child, index) => mapItem(child, `${path}.${index}`)));
        return {
            id: path,
            label: pageNumber ? `${item.title ?? "Untitled"} (${pageNumber})` : (item.title ?? "Untitled"),
            pageNumber,
            children,
        };
    }

    return Promise.all(outline.map((item, index) => mapItem(item, String(index))));
}

export function PdfReader({book, format}: PdfReaderProps) {
    const themeState = useAppSelector((state) => state.readerTheme);
    const colors = getThemeColors(themeState.mode);
    const [isMobile] = useMediaQuery(["(max-width: 768px)"]);
    const deviceName = useDeviceName();
    const {onLocationChange} = useSavePositionSync(book.id, format, deviceName);
    const navigate = useNavigate();
    const containerRef = useRef<HTMLDivElement | null>(null);
    const hasResolvedInitialPageRef = useRef(false);
    const pageNumberRef = useRef(1);
    const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
    const rapidNavStateRef = useRef<{
        startPage: number | null;
        lastNavPage: number | null;
        lastNavTime: number;
        pendingTimer: ReturnType<typeof setTimeout> | null;
    }>({ startPage: null, lastNavPage: null, lastNavTime: 0, pendingTimer: null });
    const [isClient, setIsClient] = useState(false);
    const [numPages, setNumPages] = useState<number>();
    const [pageNumber, setPageNumber] = useState(1);
    const [pageInput, setPageInput] = useState("1");
    const [zoom, setZoom] = useState(1);
    const [containerWidth, setContainerWidth] = useState<number>();
    const [loadError, setLoadError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [serverSavedPosition, setServerSavedPosition] = useState<import("../types/SavedPosition").SavedPosition | null>(null);
    const [hasLoadedServerPosition, setHasLoadedServerPosition] = useState(false);
    const [tocItems, setTocItems] = useState<PdfTocItem[]>([]);
    const [isTocOpen, setIsTocOpen] = useState(false);
    const [jumpBackPage, setJumpBackPage] = useState<number | null>(null);
    const [showKeyboardHint, setShowKeyboardHint] = useState(() => {
        if (typeof window === "undefined") return false;
        return !localStorage.getItem(KEYBOARD_HINT_KEY);
    });
    const [percentage, setPercentage] = useState<number | undefined>(() => {
        const userId = sessionStorage.getItem("user_id");
        if (!userId) return undefined;
        return getStoredProgress(userId, book.id);
    });

    const pdfUrl = useMemo(
        () => `${config.apiUrl}/books/${book.id}/download?format=${format}&inline=true`,
        [book.id, format],
    );

    /* Keep pageNumberRef in sync so the rapid-nav timer closure can read the latest value */
    pageNumberRef.current = pageNumber;

    /* Track sequential (arrow/keyboard/swipe) navigation to detect rapid page-turning.
       When the user turns 3+ pages within a quick burst, we save their origin page. */
    const trackSequentialNav = useCallback((currentPage: number) => {
        const state = rapidNavStateRef.current;
        const now = Date.now();

        if (state.pendingTimer !== null) {
            clearTimeout(state.pendingTimer);
            state.pendingTimer = null;
        }

        if (now - state.lastNavTime < 800 && state.lastNavPage !== null) {
            // Rapid navigation: save the page at the start of the burst
            if (state.startPage === null) {
                state.startPage = state.lastNavPage;
            }
            state.pendingTimer = setTimeout(() => {
                const start = state.startPage;
                const end = pageNumberRef.current;
                state.startPage = null;
                state.pendingTimer = null;
                if (start !== null && Math.abs(end - start) >= 3) {
                    setJumpBackPage((prev) => prev ?? start);
                }
            }, 1000);
        } else {
            state.startPage = null;
        }

        state.lastNavPage = currentPage;
        state.lastNavTime = now;
    }, []);


        setIsClient(true);
    }, []);

    useEffect(() => {
        hasResolvedInitialPageRef.current = false;
        setServerSavedPosition(null);
        setHasLoadedServerPosition(false);
        setTocItems([]);
        setPageNumber(1);
        setPageInput("1");
        setPercentage(() => {
            const userId = sessionStorage.getItem("user_id");
            if (!userId) return undefined;
            return getStoredProgress(userId, book.id);
        });
    }, [book.id, format]);

    useEffect(() => {
        if (!isClient) return;

        let cancelled = false;
        void getSavedPosition(book.id)
            .then((savedPosition) => {
                if (cancelled) return;
                setServerSavedPosition(savedPosition);
                setHasLoadedServerPosition(true);
            })
            .catch(() => {
                if (!cancelled) setHasLoadedServerPosition(true);
            });

        return () => {
            cancelled = true;
        };
    }, [book.id, isClient]);

    useEffect(() => {
        if (!numPages || !hasLoadedServerPosition || hasResolvedInitialPageRef.current) return;

        const activeLocalPage = getStoredPdfPage(book.id, true);
        const activeServerPage = parsePdfSavedPosition(getResumeFormatPosition(serverSavedPosition?.position, "PDF"));
        const approximatePage = getApproximatePdfPage(serverSavedPosition, numPages);
        const fallbackLocalPage = getStoredPdfPage(book.id, false);
        const fallbackServerPage = parsePdfSavedPosition(getExactFormatPosition(serverSavedPosition?.position, "PDF"));
        const initialPage = activeLocalPage ?? activeServerPage ?? approximatePage ?? fallbackLocalPage ?? fallbackServerPage ?? 1;

        hasResolvedInitialPageRef.current = true;
        setPageNumber(initialPage);
        setPercentage(getPdfProgress(initialPage, numPages));

        const userId = sessionStorage.getItem("user_id");
        if (userId) {
            storeProgress(userId, book.id, getPdfProgress(initialPage, numPages));
        }
    }, [book.id, hasLoadedServerPosition, numPages, serverSavedPosition]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container || typeof ResizeObserver === "undefined") return;

        const updateWidth = () => setContainerWidth(container.clientWidth);
        updateWidth();

        const observer = new ResizeObserver(updateWidth);
        observer.observe(container);

        return () => observer.disconnect();
    }, [isClient]);

    useEffect(() => {
        if (!numPages || !hasResolvedInitialPageRef.current) return;
        const clampedPage = Math.min(Math.max(pageNumber, 1), numPages);
        if (clampedPage !== pageNumber) {
            setPageNumber(clampedPage);
            return;
        }

        const nextPercentage = getPdfProgress(clampedPage, numPages);
        setPercentage(nextPercentage);

        const userId = sessionStorage.getItem("user_id");
        if (userId) {
            storeProgress(userId, book.id, nextPercentage);
        }

        onLocationChange(JSON.stringify({kind: "pdf", page: clampedPage}), nextPercentage);
    }, [book.id, numPages, onLocationChange, pageNumber]);

    useEffect(() => {
        setPageInput(String(pageNumber));
    }, [pageNumber]);

    useEffect(() => {
        if (!showKeyboardHint || isMobile) return;
        const timer = setTimeout(() => {
            setShowKeyboardHint(false);
            localStorage.setItem(KEYBOARD_HINT_KEY, "true");
        }, 4000);
        return () => clearTimeout(timer);
    }, [isMobile, showKeyboardHint]);

    const canGoPrevious = pageNumber > 1;
    const canGoNext = !!numPages && pageNumber < numPages;

    const closeReader = useCallback(() => {
        navigate(`/books/${book.id}`);
    }, [book.id, navigate]);

    const zoomOut = useCallback(() => {
        setZoom((value) => Math.max(0.5, value - 0.1));
    }, []);

    const zoomIn = useCallback(() => {
        setZoom((value) => Math.min(2.5, value + 0.1));
    }, []);

    const goToPreviousPage = useCallback(() => {
        if (!canGoPrevious) return;
        trackSequentialNav(pageNumber);
        setPageNumber((value) => value - 1);
    }, [canGoPrevious, pageNumber, trackSequentialNav]);

    const goToNextPage = useCallback(() => {
        if (!canGoNext) return;
        trackSequentialNav(pageNumber);
        setPageNumber((value) => value + 1);
    }, [canGoNext, pageNumber, trackSequentialNav]);

    const goToPage = useCallback((value: string) => {
        if (!numPages) return;
        const nextPage = Number.parseInt(value, 10);
        if (!Number.isInteger(nextPage)) {
            setPageInput(String(pageNumber));
            return;
        }
        const clampedNext = Math.min(numPages, Math.max(1, nextPage));
        if (clampedNext !== pageNumber) {
            setJumpBackPage(pageNumber);
            setPageNumber(clampedNext);
        }
    }, [numPages, pageNumber]);

    useEffect(() => {
        if (!isClient) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            const target = event.target as HTMLElement | null;
            if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) {
                return;
            }
            if (event.ctrlKey || event.metaKey || event.altKey) {
                return;
            }

            switch (event.key) {
                case "Escape":
                    event.preventDefault();
                    closeReader();
                    break;
                case "t":
                case "T":
                    event.preventDefault();
                    setIsTocOpen(true);
                    break;
                case "ArrowLeft":
                case "PageUp":
                    event.preventDefault();
                    goToPreviousPage();
                    break;
                case "ArrowRight":
                case "PageDown":
                case " ":
                    event.preventDefault();
                    goToNextPage();
                    break;
                case "Home":
                    event.preventDefault();
                    setPageNumber(1);
                    break;
                case "End":
                    if (!numPages) return;
                    event.preventDefault();
                    setPageNumber(numPages);
                    break;
                case "-":
                case "_":
                    event.preventDefault();
                    zoomOut();
                    break;
                case "+":
                case "=":
                    event.preventDefault();
                    zoomIn();
                    break;
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [closeReader, goToNextPage, goToPreviousPage, isClient, numPages, zoomIn, zoomOut]);

    /* Touch-swipe navigation for mobile — a horizontal swipe turns the page and
       contributes to the rapid-navigation burst that triggers the jump-back widget. */
    useEffect(() => {
        if (!isClient) return;
        const container = containerRef.current;
        if (!container) return;

        const handleTouchStart = (e: TouchEvent) => {
            touchStartRef.current = {
                x: e.touches[0].clientX,
                y: e.touches[0].clientY,
                time: Date.now(),
            };
        };

        const handleTouchEnd = (e: TouchEvent) => {
            const start = touchStartRef.current;
            if (!start) return;
            touchStartRef.current = null;
            const dx = e.changedTouches[0].clientX - start.x;
            const dy = e.changedTouches[0].clientY - start.y;
            const dt = Date.now() - start.time;
            // Only fire on quick, clearly-horizontal swipes to avoid interfering with scroll
            if (Math.abs(dx) > Math.abs(dy) * 1.5 && Math.abs(dx) > 50 && dt < 400) {
                if (dx > 0) goToPreviousPage();
                else goToNextPage();
            }
        };

        container.addEventListener("touchstart", handleTouchStart, { passive: true });
        container.addEventListener("touchend", handleTouchEnd, { passive: true });
        return () => {
            container.removeEventListener("touchstart", handleTouchStart);
            container.removeEventListener("touchend", handleTouchEnd);
        };
    }, [isClient, goToPreviousPage, goToNextPage]);

    if (!isClient) {
        return null;
    }

    const hintBg =
        themeState.mode === "dark"
            ? "rgba(45, 55, 72, 0.9)"
            : themeState.mode === "sepia"
              ? "rgba(91, 70, 54, 0.9)"
              : "rgba(74, 85, 104, 0.9)";

    return (
        <>
            <Box
                bg={colors.bg}
                h="100dvh"
                w="100%"
                position="fixed"
                top={0}
                left={0}
                zIndex={1000}
                pt="48px"
                pb="28px"
            >
                <ReaderLoadingState isLoading={isLoading} error={loadError} colors={colors} />
                <Box
                    ref={containerRef}
                    h="100%"
                    overflow="auto"
                    px={{base: 2, md: 6}}
                    py={4}
                >
                    <Flex justify="center" minH="100%" align="start">
                        <Document
                            file={pdfUrl}
                            loading={null}
                            onLoadSuccess={(loadedPdf) => {
                                setNumPages(loadedPdf.numPages);
                                setIsLoading(false);
                                setLoadError(null);
                                void buildPdfToc(loadedPdf as PdfDocumentLike)
                                    .then(setTocItems)
                                    .catch(() => setTocItems([]));
                            }}
                            onLoadError={(error) => {
                                setLoadError(error.message);
                                setIsLoading(false);
                                setTocItems([]);
                            }}
                            error={null}
                        >
                            <Page
                                pageNumber={pageNumber}
                                width={containerWidth ? Math.max(Math.floor(containerWidth - 32), 280) : undefined}
                                scale={zoom}
                                renderAnnotationLayer
                                renderTextLayer
                            />
                        </Document>
                    </Flex>
                </Box>
            </Box>

            {/* Top-left: TOC */}
            <IconButton
                aria-label="Table of contents"
                position="fixed"
                top={2}
                left={2}
                zIndex={1001}
                borderRadius="full"
                size="sm"
                bg={colors.btnBg}
                color={colors.text}
                boxShadow="md"
                _hover={{ bg: colors.btnHoverBg }}
                onClick={() => setIsTocOpen(true)}
            >
                <LuList />
            </IconButton>

            <ReaderToc
                isOpen={isTocOpen}
                onClose={() => setIsTocOpen(false)}
                tocItems={tocItems}
                getChildren={(item) => item.children}
                onNavigate={(item) => {
                    if (item.pageNumber && item.pageNumber !== pageNumber) {
                        setJumpBackPage(pageNumber);
                        setPageNumber(item.pageNumber);
                    }
                }}
                colors={colors}
                title="PDF Outline"
            />

            {/* Top-center: page navigation and zoom controls */}
            <Flex
                position="fixed"
                top={2}
                left="50%"
                transform="translateX(-50%)"
                zIndex={1001}
                align="center"
                gap={1}
                bg={colors.btnBg}
                color={colors.text}
                borderRadius="full"
                px={2}
                py={1}
                boxShadow="md"
            >
                <IconButton
                    aria-label="Zoom out"
                    size="sm"
                    variant="ghost"
                    color={colors.text}
                    borderRadius="full"
                    onClick={zoomOut}
                >
                    <LuMinus />
                </IconButton>
                <Text fontSize="xs" minW="36px" textAlign="center">{Math.round(zoom * 100)}%</Text>
                <IconButton
                    aria-label="Zoom in"
                    size="sm"
                    variant="ghost"
                    color={colors.text}
                    borderRadius="full"
                    onClick={zoomIn}
                >
                    <LuPlus />
                </IconButton>
                <Box w="1px" h="16px" bg={colors.uiBorder} mx={1} flexShrink={0} />
                <IconButton
                    aria-label="Previous page"
                    size="sm"
                    variant="ghost"
                    color={colors.text}
                    borderRadius="full"
                    onClick={goToPreviousPage}
                    disabled={!canGoPrevious}
                >
                    <LuChevronLeft />
                </IconButton>
                <Input
                    size="sm"
                    type="number"
                    min={1}
                    max={numPages}
                    width="48px"
                    value={pageInput}
                    onChange={(event) => setPageInput(event.currentTarget.value)}
                    onBlur={() => goToPage(pageInput)}
                    onKeyDown={(event) => {
                        if (event.key === "Enter") {
                            event.preventDefault();
                            goToPage(pageInput);
                        }
                    }}
                    aria-label="Page number"
                    textAlign="center"
                    bg="transparent"
                    border="none"
                    p={0}
                    _focusVisible={{ outline: "none", boxShadow: "none" }}
                />
                <Text fontSize="xs" whiteSpace="nowrap">/ {numPages ?? "?"}</Text>
                <IconButton
                    aria-label="Next page"
                    size="sm"
                    variant="ghost"
                    color={colors.text}
                    borderRadius="full"
                    onClick={goToNextPage}
                    disabled={!canGoNext}
                >
                    <LuChevronRight />
                </IconButton>
            </Flex>

            {/* Top-center-right: Settings */}
            <ReaderSettingsMenu />

            {/* Top-right: Close */}
            <IconButton
                aria-label="Close reader"
                position="fixed"
                top={2}
                right={2}
                zIndex={1001}
                borderRadius="full"
                size="sm"
                bg={colors.btnBg}
                color={colors.text}
                boxShadow="md"
                _hover={{ bg: colors.btnHoverBg }}
                onClick={closeReader}
            >
                <LuX />
            </IconButton>

            {/* Side navigation arrows — hidden on mobile */}
            {!isMobile && (
                <>
                    <IconButton
                        aria-label="Previous page"
                        position="fixed"
                        left={2}
                        top="50%"
                        transform="translateY(-50%)"
                        zIndex={1001}
                        borderRadius="full"
                        size="md"
                        bg={colors.btnBg}
                        color={colors.text}
                        boxShadow="md"
                        _hover={{ bg: colors.btnHoverBg }}
                        onClick={goToPreviousPage}
                        disabled={!canGoPrevious}
                    >
                        <LuChevronLeft />
                    </IconButton>
                    <IconButton
                        aria-label="Next page"
                        position="fixed"
                        right={2}
                        top="50%"
                        transform="translateY(-50%)"
                        zIndex={1001}
                        borderRadius="full"
                        size="md"
                        bg={colors.btnBg}
                        color={colors.text}
                        boxShadow="md"
                        _hover={{ bg: colors.btnHoverBg }}
                        onClick={goToNextPage}
                        disabled={!canGoNext}
                    >
                        <LuChevronRight />
                    </IconButton>
                </>
            )}

            <ReaderProgressBar percentage={percentage} colors={colors} />

            {showKeyboardHint && !isMobile && (
                <Flex
                    position="fixed"
                    bottom={6}
                    left="50%"
                    transform="translateX(-50%)"
                    zIndex={1002}
                    bg={hintBg}
                    color="white"
                    px={4}
                    py={2}
                    borderRadius="full"
                    fontSize="sm"
                    boxShadow="lg"
                >
                    Use arrow keys or buttons to turn pages
                </Flex>
            )}

            {jumpBackPage !== null && (
                <JumpBackButton
                    pageLabel={`Page ${jumpBackPage}`}
                    onJumpBack={() => {
                        setPageNumber(jumpBackPage);
                        setJumpBackPage(null);
                    }}
                    onDismiss={() => setJumpBackPage(null)}
                    colors={colors}
                    thumbnailContent={
                        <Document file={pdfUrl} loading={null} error={null}>
                            <Page
                                pageNumber={jumpBackPage}
                                width={80}
                                renderAnnotationLayer={false}
                                renderTextLayer={false}
                            />
                        </Document>
                    }
                />
            )}
        </>
    );
}
