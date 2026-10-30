import { useCallback, useEffect, useRef, useState } from "react";
import { Box, Button, Spinner, Text, useMediaQuery } from "@chakra-ui/react";
import { LuChevronLeft, LuChevronRight } from "react-icons/lu";
import { useAppSelector } from "@/app/hooks";
import {getReaderControlColors} from "./ReaderUI";
import type { BookModel } from "@/entities/book/model/BookModel";
import type {BookFormatType} from "@/entities/book/model/bookFormats";
import { useDeviceName } from "../hooks/useDeviceName";
import { useSavePositionSync } from "../hooks/useSavePositionSync";
import { useEpubNavigator } from "../hooks/useEpubNavigator";
import { usePositionConflict } from "../hooks/usePositionConflict";
import { useKeyboardNavigation } from "../hooks/useKeyboardNavigation";
import { ReaderLoadingState } from "./ReaderLoadingState";
import { ReaderProgressBar } from "./ReaderProgressBar";
import { ReaderControls } from "./ReaderControls";
import { JumpToSavedPositionModal } from "@/features/reader";
import { Locator } from "@readium/shared";
import {useAnnotations} from "@/features/koreader/useAnnotations";
import {useAnnotationFrames} from "../hooks/useAnnotationFrames";
import {useResolvedAnnotations} from "../hooks/useResolvedAnnotations";
import {AnnotationsPanel} from "./AnnotationsPanel";
import type {Annotation} from "@/features/koreader/api";
import type {PortableLocation} from "../types/PortableLocation";

const KEYBOARD_HINT_KEY = "reader-keyboard-hint-shown";

interface ReaderProps {
    book: BookModel;
    format: BookFormatType;
}

export function Reader({ book, format }: ReaderProps) {
    const deviceName = useDeviceName();
    const themeState = useAppSelector((state) => state.readerTheme);
    const colors = getReaderControlColors(themeState.mode);
    const [isMobile] = useMediaQuery(["(max-width: 768px)"]);
    const [showKeyboardHint, setShowKeyboardHint] = useState(() => {
        if (typeof window === "undefined") return false;
        return !localStorage.getItem(KEYBOARD_HINT_KEY);
    });

    /* Jump-back state: lifted here so both TOC jumps (in ReaderControls) and
       rapid-swipe detection (below) can set it. */
    const [jumpBackLocator, setJumpBackLocator] = useState<Locator | null>(null);
    const jumpBackLocatorRef = useRef<Locator | null>(null);
    jumpBackLocatorRef.current = jumpBackLocator;

    /* Shared ref for the publication's resource base URL (set by useEpubNavigator after
       the manifest loads). Passed to useSavePositionSync so cloud-saved hrefs are stored
       as EPUB-internal paths rather than full server URLs. */
    const resourceBaseRef = useRef<string | undefined>(undefined);
    const savesEnabledRef = useRef(false);
    const restoreHoldRef = useRef(false);
    const portableLocationRef = useRef<PortableLocation | undefined>(undefined);
    const latestReadingRef = useRef<{locator: Locator; percentage?: number} | null>(null);
    const annotations = useAnnotations(book.id, format === "EPUB");
    const frameCallbacks = useRef<{register: (wnd: Window) => void; capture: () => void} | null>(null);
    const registerFrame = useCallback((wnd: Window) => frameCallbacks.current?.register(wnd), []);
    const captureSelection = useCallback(() => frameCallbacks.current?.capture(), []);
    const [annotationJumpError, setAnnotationJumpError] = useState("");
    const pendingAnnotationJump = useRef<Annotation | null>(null);

    /* Rapid-swipe detection for EPUB: tracks consecutive positionChanged events.
       Three or more page turns within 800 ms → save origin for jump-back immediately. */
    const prevLocatorJsonRef = useRef<string | null>(null);
    const rapidNavStateRef = useRef<{
        startLocatorJson: string | null;
        lastChangeTime: number;
        changeCount: number;
    }>({ startLocatorJson: null, lastChangeTime: 0, changeCount: 0 });

    const { onLocationChange, saveImmediate } = useSavePositionSync(book.id, format, deviceName, resourceBaseRef, savesEnabledRef, portableLocationRef);

    const handleLocationChange = useCallback((locator: Locator, percentage?: number) => {
        latestReadingRef.current = {locator, percentage};
        const prevLocatorJson = prevLocatorJsonRef.current;
        onLocationChange(locator, percentage);

        if (!jumpBackLocatorRef.current && prevLocatorJson !== null) {
            const state = rapidNavStateRef.current;
            const now = Date.now();

            if (now - state.lastChangeTime < 800) {
                if (state.startLocatorJson === null) {
                    state.startLocatorJson = prevLocatorJson;
                }
                state.changeCount++;
                // Show jump-back immediately on the 3rd rapid location change (changeCount reaches 2)
                if (state.changeCount >= 2 && !jumpBackLocatorRef.current) {
                    try {
                        const locator = Locator.deserialize(JSON.parse(state.startLocatorJson!));
                        if (locator) setJumpBackLocator(locator);
                    } catch {
                        // ignore malformed locator
                    }
                }
            } else {
                state.startLocatorJson = null;
                state.changeCount = 0;
            }

            state.lastChangeTime = now;
        }

        prevLocatorJsonRef.current = JSON.stringify(locator.serialize());
    }, [onLocationChange]);
    const saveCurrentImmediate = useCallback(async (locator: Locator, percentage?: number) => {
        const current = latestReadingRef.current;
        await saveImmediate(current?.locator ?? locator, current?.percentage ?? percentage);
    }, [saveImmediate]);
    const getReadingLocator = useCallback(() => latestReadingRef.current?.locator, []);

    const [controlsVisible, setControlsVisible] = useState(true);
    const toggleControls = useCallback(() => setControlsVisible((visible) => !visible), []);

    const { containerRef, navigatorRef, isLoading, isLoaded, loadError, isChapterTransitioning, mobileSwipeOverlay, percentage, tocItems, resolveStoredLocator, resolvePercentage, resolveResource, resolvePortable, progressLabel, validateStoredLocator } =
        useEpubNavigator(book, format, themeState, handleLocationChange, isMobile && !themeState.scroll, resourceBaseRef, registerFrame, captureSelection, portableLocationRef, savesEnabledRef, restoreHoldRef, isMobile ? toggleControls : undefined);
    const resolvedAnnotations = useResolvedAnnotations(annotations.items, navigatorRef, isLoaded, book.id);
    const annotationFrames = useAnnotationFrames(resolvedAnnotations.items, resourceBaseRef, themeState, containerRef);
    frameCallbacks.current = annotationFrames;

    const { modalCase, handleJump, handleKeepLocal, closePositionPrompt, positionError, retryPosition } = usePositionConflict(
        book.id,
        navigatorRef,
        deviceName,
        isLoaded,
        onLocationChange,
        saveCurrentImmediate,
        resolveStoredLocator,
        resourceBaseRef,
        savesEnabledRef,
        resolvePercentage,
        resolvePortable,
        restoreHoldRef,
        validateStoredLocator,
    );
    useEffect(() => {
        const item = pendingAnnotationJump.current;
        const status = item ? annotationFrames.resolution[item.id] : undefined;
        if (!item || !status || status === "Not in an open chapter") return;
        pendingAnnotationJump.current = null;
        const progression = annotationFrames.locate(item, themeState.scroll);
        const locator = item.anchor.href ? resolveResource(item.anchor.href) : null;
        if (progression === null || !locator) { setAnnotationJumpError("Quote or layout unresolved in this chapter. No guessed quote jump was applied."); return; }
        navigatorRef.current?.go(locator.copyWithLocations({progression}), true, ok => {
            if (!ok) setAnnotationJumpError("Unable to show the exact quote. Its chapter remains open.");
        });
    }, [annotationFrames.resolution, annotationFrames.locate, themeState.scroll, resolveResource, navigatorRef]);

    function jumpToAnnotation(item: Annotation) {
        setAnnotationJumpError("");
        const locator = item.anchor.href ? resolveResource(item.anchor.href) : null;
        if (!locator) { setAnnotationJumpError("Annotation resource is unresolved. No guessed jump was applied."); return; }
        const progression = annotationFrames.locate(item, themeState.scroll);
        if (progression !== null) {
            navigatorRef.current?.go(locator.copyWithLocations({progression}), true, ok => {
                if (!ok) setAnnotationJumpError("Unable to show the exact quote. Retry when the reader is ready.");
            });
            return;
        }
        pendingAnnotationJump.current = item;
        navigatorRef.current?.go(locator, true, ok => {
            if (!ok) {
                pendingAnnotationJump.current = null;
                setAnnotationJumpError("Unable to open annotation chapter. Retry when the reader is ready.");
            }
        });
    }

    useKeyboardNavigation(navigatorRef);

    useEffect(() => {
        if (!showKeyboardHint || isMobile) return;
        const timer = setTimeout(() => {
            setShowKeyboardHint(false);
            localStorage.setItem(KEYBOARD_HINT_KEY, "true");
        }, 4000);
        return () => clearTimeout(timer);
    }, [showKeyboardHint, isMobile]);

    const showMobileSwipeOverlay =
        isMobile &&
        !isLoading &&
        !loadError &&
        !themeState.scroll &&
        !!mobileSwipeOverlay;
    const swipeOverlayOffset = mobileSwipeOverlay ? (1 - mobileSwipeOverlay.progress) * 36 : 36;
    const swipeOverlayOpacity = mobileSwipeOverlay?.isLoading ? 1 : Math.min((mobileSwipeOverlay?.progress ?? 0) * 1.1, 1);
    const swipeOverlayTransform =
        mobileSwipeOverlay?.direction === "forward"
            ? `translateY(-50%) translateX(${swipeOverlayOffset}px)`
            : `translateY(-50%) translateX(${-swipeOverlayOffset}px)`;
    const swipeOverlayTransition = mobileSwipeOverlay?.isTracking
        ? "opacity 80ms linear"
        : "transform 180ms ease, opacity 180ms ease";

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
                display="flex"
                justifyContent="center"
                pt="60px"
                pb="54px"
            >
                <ReaderLoadingState isLoading={isLoading} error={loadError} colors={colors} />
                {showMobileSwipeOverlay && mobileSwipeOverlay && (
                    <Box
                        position="absolute"
                        top="50%"
                        left={mobileSwipeOverlay.direction === "backward" ? 2 : "auto"}
                        right={mobileSwipeOverlay.direction === "forward" ? 2 : "auto"}
                        transform={swipeOverlayTransform}
                        opacity={swipeOverlayOpacity}
                        transition={swipeOverlayTransition}
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        w="44px"
                        h="44px"
                        borderRadius="full"
                        bg={colors.btnBg}
                        color={colors.text}
                        boxShadow="lg"
                        border="1px solid"
                        borderColor={colors.uiBorder}
                        zIndex={2}
                        pointerEvents="none"
                        role="status"
                        aria-live="polite"
                        aria-label={
                            mobileSwipeOverlay.isLoading
                                ? mobileSwipeOverlay.direction === "forward"
                                    ? "Loading next chapter"
                                    : "Loading previous chapter"
                                : mobileSwipeOverlay.direction === "forward"
                                  ? "Next chapter swipe"
                                  : "Previous chapter swipe"
                        }
                    >
                        {mobileSwipeOverlay.isLoading ? (
                            <Spinner size="sm" color={colors.text} />
                        ) : mobileSwipeOverlay.direction === "forward" ? (
                            <LuChevronRight size={20} />
                        ) : (
                            <LuChevronLeft size={20} />
                        )}
                    </Box>
                )}
                <Box ref={containerRef} h="100%" w="100%" position="relative" />
            </Box>

            <ReaderControls
                themeState={themeState}
                colors={colors}
                showKeyboardHint={showKeyboardHint}
                isMobile={isMobile}
                controlsVisible={!isMobile || controlsVisible}
                isChapterTransitioning={isChapterTransitioning}
                tocItems={tocItems}
                navigatorRef={navigatorRef}
                jumpBackLocator={jumpBackLocator}
                onSetJumpBackLocator={setJumpBackLocator}
                getReadingLocator={getReadingLocator}
            />

            <ReaderProgressBar percentage={percentage} colors={colors} />
            <Text position="fixed" bottom="6px" left="12px" right="52px" fontSize="xs" color={colors.text}
                bg={colors.uiBg} px={2} py={1} borderRadius="md" textAlign="center" pointerEvents="none" zIndex={1001}
                lineClamp={2} aria-live="polite">{progressLabel}</Text>
            {format === "EPUB" && <AnnotationsPanel {...annotations} colors={colors} buttonVisible={!isMobile || controlsVisible} items={resolvedAnnotations.items}
                epubFormatId={book.formats?.find(item => item.format === "EPUB")?.id}
                selection={annotationFrames.selection} clearSelection={annotationFrames.clearSelection}
                resolution={{...annotationFrames.resolution, ...resolvedAnnotations.unresolved}} jump={jumpToAnnotation}
                error={[annotations.error, resolvedAnnotations.error, annotationJumpError, resolvedAnnotations.searching ? "Verifying native quotes across all EPUB chapters..." : ""].filter(Boolean).join(" ")}
                refresh={async () => { resolvedAnnotations.retry(); await annotations.refresh(); }}/>}
            {positionError && <Box position="fixed" bottom="36px" left="8px" right="8px" p={4} bg="bg.panel" color="fg" zIndex={1300}>
                <Text role="alert">{positionError}</Text>
                <Button onClick={retryPosition}>Retry position check</Button>
                <Button onClick={closePositionPrompt}>Stay here and enable saves</Button>
            </Box>}

            {modalCase && (
                <JumpToSavedPositionModal
                    modalCase={modalCase}
                    open={!!modalCase}
                    onJump={handleJump}
                    onKeepLocal={handleKeepLocal}
                    onClose={closePositionPrompt}
                />
            )}
        </>
    );
}
