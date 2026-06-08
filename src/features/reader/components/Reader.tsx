import { useEffect, useState } from "react";
import { Box, useMediaQuery } from "@chakra-ui/react";
import { keyframes } from "@emotion/react";
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
import { JumpToSavedPositionModal } from "./JumpToSavedPositionModal";

const KEYBOARD_HINT_KEY = "reader-keyboard-hint-shown";

const chapterLoadBar = keyframes`
  0%   { transform: translateX(-100%); width: 40%; }
  50%  { width: 60%; }
  100% { transform: translateX(350%); width: 40%; }
`;

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
    const [showTransitionIndicator, setShowTransitionIndicator] = useState(false);

    const { onLocationChange, saveImmediate } = useSavePositionSync(book.id, format, deviceName);

    const { containerRef, navigatorRef, isLoading, isLoaded, loadError, isChapterTransitioning, percentage, tocItems } =
        useEpubNavigator(book, format, themeState, onLocationChange);

    const { modalCase, setModalCase, handleJump, handleKeepLocal } = usePositionConflict(
        book.id,
        navigatorRef,
        deviceName,
        isLoaded,
        onLocationChange,
        saveImmediate,
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

    useEffect(() => {
        if (!isChapterTransitioning) {
            setShowTransitionIndicator(false);
            return;
        }

        const timer = setTimeout(() => {
            setShowTransitionIndicator(true);
        }, 400);

        return () => clearTimeout(timer);
    }, [isChapterTransitioning]);

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
                {showTransitionIndicator && !isLoading && !loadError && (
                    <Box
                        position="absolute"
                        top={0}
                        left={0}
                        right={0}
                        h="2px"
                        overflow="hidden"
                        zIndex={2}
                        pointerEvents="none"
                        role="status"
                        aria-live="polite"
                        aria-label="Loading chapter"
                    >
                        <Box
                            position="absolute"
                            top={0}
                            left={0}
                            h="100%"
                            w="40%"
                            bg={colors.muted}
                            opacity={0.6}
                            css={{ animation: `${chapterLoadBar} 1.2s ease-in-out infinite` }}
                        />
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
