import { useCallback, useEffect, useRef, useState } from "react";
import { Box, Spinner, useMediaQuery } from "@chakra-ui/react";
import { LuChevronLeft, LuChevronRight } from "react-icons/lu";
import { useAppSelector } from "@/app/hooks";
import { getThemeColors } from "../types/ReaderTheme";
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

const KEYBOARD_HINT_KEY = "reader-keyboard-hint-shown";

interface ReaderProps {
    book: BookModel;
    format: BookFormatType;
}

export function Reader({ book, format }: ReaderProps) {
    const deviceName = useDeviceName();
    const themeState = useAppSelector((state) => state.readerTheme);
    const colors = getThemeColors(themeState.mode);
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

    /* Rapid-swipe detection for EPUB — tracks consecutive positionChanged events.
       Three or more page turns within 800 ms → save origin for jump-back immediately. */
    const prevLocatorJsonRef = useRef<string | null>(null);
    const navigatorRefForRapidNav = useRef<typeof navigatorRef.current>(null);
    const rapidNavStateRef = useRef<{
        startLocatorJson: string | null;
        lastChangeTime: number;
        changeCount: number;
    }>({ startLocatorJson: null, lastChangeTime: 0, changeCount: 0 });

    const { onLocationChange, saveImmediate } = useSavePositionSync(book.id, format, deviceName, resourceBaseRef);

    const handleLocationChange = useCallback((locator: Locator, percentage?: number) => {
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

        // Store the current position so the NEXT call can detect a rapid-nav burst.
        // We read currentLocator from the navigator (already updated to new position)
        // and fall back to the raw JSON string if the navigator isn't ready yet.
        const navLocator = navigatorRefForRapidNav.current?.currentLocator;
        prevLocatorJsonRef.current = navLocator ? JSON.stringify(navLocator.serialize()) : JSON.stringify(locator.serialize());
    }, [onLocationChange]);

    const { containerRef, navigatorRef, isLoading, isLoaded, loadError, isChapterTransitioning, mobileSwipeOverlay, percentage, tocItems, resolveStoredLocator } =
        useEpubNavigator(book, format, themeState, handleLocationChange, isMobile && !themeState.scroll, resourceBaseRef);

    // Keep the proxy ref in sync so handleLocationChange can read currentLocator
    navigatorRefForRapidNav.current = navigatorRef.current;

    const { modalCase, setModalCase, handleJump, handleKeepLocal } = usePositionConflict(
        book.id,
        navigatorRef,
        deviceName,
        isLoaded,
        onLocationChange,
        saveImmediate,
        resolveStoredLocator,
        resourceBaseRef,
    );

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
                pt="48px"
                pb="28px"
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
                isChapterTransitioning={isChapterTransitioning}
                tocItems={tocItems}
                navigatorRef={navigatorRef}
                jumpBackLocator={jumpBackLocator}
                onSetJumpBackLocator={setJumpBackLocator}
            />

            <ReaderProgressBar percentage={percentage} colors={colors} />

            {modalCase && (
                <JumpToSavedPositionModal
                    modalCase={modalCase}
                    open={!!modalCase}
                    onJump={handleJump}
                    onKeepLocal={handleKeepLocal}
                    onClose={() => setModalCase(null)}
                />
            )}
        </>
    );
}
