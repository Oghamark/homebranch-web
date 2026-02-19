import type {Route} from "./+types/read-book";

import {type IReactReaderStyle, ReactReader, ReactReaderStyle,} from "react-reader";
import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {Box, Flex, IconButton, Spinner, Text, useMediaQuery} from "@chakra-ui/react";
import {Navigate, useNavigate} from "react-router";
import {config} from "@/shared";
import ToastFactory from "@/app/utils/toast_handler";
import {useGetBookByIdQuery} from "@/entities/book";
import {useColorMode} from "@/components/ui/color-mode";
import {LuX} from "react-icons/lu";
import type {Rendition} from "epubjs";

function getInitialLocation(bookId: string): string | number {
    const savedLocation = JSON.parse(
        localStorage.getItem("currentlyReading") ?? "{}"
    )[bookId];
    return savedLocation ?? 0;
}

const KEYBOARD_HINT_KEY = "reader-keyboard-hint-shown";

export default function ReadBook({params}: Route.ComponentProps) {
    const {bookId} = params;
    const {data: book, error, isLoading} = useGetBookByIdQuery(bookId);
    const {colorMode} = useColorMode();
    const isDark = colorMode === "dark";

    const navigate = useNavigate();

    const [location, setLocation] = useState<string | number>(getInitialLocation(bookId));
    const renditionRef = useRef<Rendition | null>(null);

    const [isMobile] = useMediaQuery(["(max-width: 768px)"]);

    const [showKeyboardHint, setShowKeyboardHint] = useState(() => {
        if (typeof window === "undefined") return false;
        return !localStorage.getItem(KEYBOARD_HINT_KEY);
    });

    const readerTheme = useResponsiveReaderTheme(isDark);

    useEffect(() => {
        const currentlyReading = JSON.parse(
            localStorage.getItem("currentlyReading") ?? "{}"
        );
        currentlyReading[bookId] = location;
        localStorage.setItem("currentlyReading", JSON.stringify(currentlyReading));
    }, [location]);

    // Apply dark/light styles to epub content when color mode changes
    useEffect(() => {
        const rendition = renditionRef.current;
        if (!rendition) return;
        if (isDark) {
            rendition.themes.override("color", "#e2e8f0");
            rendition.themes.override("background", "#1a202c");
        } else {
            rendition.themes.override("color", "#1a202c");
            rendition.themes.override("background", "#ffffff");
        }
    }, [isDark]);

    // Auto-dismiss keyboard hint
    useEffect(() => {
        if (!showKeyboardHint || isMobile) return;
        const timer = setTimeout(() => {
            setShowKeyboardHint(false);
            localStorage.setItem(KEYBOARD_HINT_KEY, "true");
        }, 4000);
        return () => clearTimeout(timer);
    }, [showKeyboardHint, isMobile]);

    const handleGetRendition = useCallback((rendition: Rendition) => {
        renditionRef.current = rendition;
        if (isDark) {
            rendition.themes.override("color", "#e2e8f0");
            rendition.themes.override("background", "#1a202c");
        } else {
            rendition.themes.override("color", "#1a202c");
            rendition.themes.override("background", "#ffffff");
        }
    }, [isDark]);

    const bgColor = isDark ? "#1a202c" : "#ffffff";

    if (isLoading) {
        return (
            <Flex
                h="100vh"
                w="100%"
                position="fixed"
                top={0}
                left={0}
                zIndex={1000}
                align="center"
                justify="center"
                bg={bgColor}
            >
                <Spinner size="xl" color={isDark ? "#a0aec0" : "#718096"}/>
            </Flex>
        );
    }

    if (error || !book) {
        ToastFactory({message: "Failed to open book", type: "error"});
        return <Navigate to={"/"}/>;
    }

    return (
        <>
            <Box
                h="100vh"
                w="100%"
                position="fixed"
                top={0}
                left={0}
                zIndex={1000}
            >
                <ReactReader
                    url={`${config.apiUrl}/uploads/books/${book.fileName}`}
                    title={book.title}
                    location={location}
                    locationChanged={setLocation}
                    readerStyles={readerTheme}
                    swipeable={true}
                    getRendition={handleGetRendition}
                    loadingView={
                        <Flex
                            position="absolute"
                            top={0}
                            left={0}
                            right={0}
                            bottom={0}
                            align="center"
                            justify="center"
                            direction="column"
                            gap={3}
                        >
                            <Spinner size="lg" color={isDark ? "#a0aec0" : "#718096"}/>
                            <Text color={isDark ? "#a0aec0" : "#718096"} fontSize="sm">
                                Loading book...
                            </Text>
                        </Flex>
                    }
                />
            </Box>
            <IconButton
                aria-label="Close reader"
                position="fixed"
                top={2}
                right={2}
                zIndex={1001}
                borderRadius="full"
                size="sm"
                bg={isDark ? "rgba(45, 55, 72, 0.8)" : "rgba(255, 255, 255, 0.8)"}
                color={isDark ? "#e2e8f0" : "#2d3748"}
                boxShadow="md"
                _hover={{
                    bg: isDark ? "rgba(45, 55, 72, 1)" : "rgba(237, 242, 247, 1)",
                }}
                onClick={() => navigate(-1)}
            >
                <LuX/>
            </IconButton>

            {/* Keyboard hint - desktop only */}
            {showKeyboardHint && !isMobile && (
                <Flex
                    position="fixed"
                    bottom={6}
                    left="50%"
                    transform="translateX(-50%)"
                    zIndex={1001}
                    bg={isDark ? "rgba(45, 55, 72, 0.9)" : "rgba(74, 85, 104, 0.9)"}
                    color="white"
                    px={4}
                    py={2}
                    borderRadius="full"
                    fontSize="sm"
                    boxShadow="lg"
                    animation="fadeIn 0.3s ease-in"
                >
                    Use arrow keys to turn pages
                </Flex>
            )}
        </>
    );
}

function useResponsiveReaderTheme(isDark: boolean): IReactReaderStyle {
    const [isMobile, isMobileHorizontal] = useMediaQuery([
        "(max-width: 768px)",
        "(max-height: 768px)",
    ]);

    const isSmallScreen = isMobile || isMobileHorizontal;

    return useMemo(
        () => ({
            ...ReactReaderStyle,
            container: {
                ...ReactReaderStyle.container,
                backgroundColor: isDark ? "#1a202c" : "#ffffff",
            },
            readerArea: {
                ...ReactReaderStyle.readerArea,
                backgroundColor: isDark ? "#1a202c" : "#ffffff",
                transition: undefined,
            },
            reader: {
                ...ReactReaderStyle.reader,
                ...(isSmallScreen && {
                    position: "absolute" as const,
                    top: 40,
                    left: 8,
                    right: 8,
                    bottom: 8,
                }),
            },
            titleArea: {
                ...ReactReaderStyle.titleArea,
                color: isDark ? "#a0aec0" : "#999",
                ...(isSmallScreen && {
                    top: 8,
                    left: 16,
                    right: 16,
                    fontSize: "0.85em",
                }),
            },
            // Navigation arrows
            arrow: {
                ...ReactReaderStyle.arrow,
                color: isDark ? "#a0aec0" : "#718096",
                ...(isSmallScreen && {
                    display: "none",
                }),
            },
            arrowHover: {
                ...ReactReaderStyle.arrowHover,
                color: isDark ? "#e2e8f0" : "#2d3748",
                background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                borderRadius: "4px",
            },
            prev: {
                ...ReactReaderStyle.prev,
            },
            next: {
                ...ReactReaderStyle.next,
            },
            // TOC sidebar
            tocArea: {
                ...ReactReaderStyle.tocArea,
                backgroundColor: isDark ? "#2d3748" : "#f7fafc",
            },
            tocAreaButton: {
                ...ReactReaderStyle.tocAreaButton,
                color: isDark ? "#e2e8f0" : "#2d3748",
                borderBottom: isDark ? "1px solid #4a5568" : "1px solid #e2e8f0",
                padding: "10px 16px",
            },
            tocButtonExpanded: {
                ...ReactReaderStyle.tocButtonExpanded,
                background: isDark ? "#4a5568" : "#f2f2f2",
            },
            tocButton: {
                ...ReactReaderStyle.tocButton,
            },
            tocButtonBar: {
                ...ReactReaderStyle.tocButtonBar,
                background: isDark ? "#a0aec0" : "#ccc",
            },
            tocButtonBarTop: {
                ...ReactReaderStyle.tocButtonBarTop,
            },
            tocButtonBottom: {
                ...ReactReaderStyle.tocButtonBottom,
            },
            tocBackground: {
                ...ReactReaderStyle.tocBackground,
            },
            toc: {
                ...ReactReaderStyle.toc,
            },
            swipeWrapper: {
                ...ReactReaderStyle.swipeWrapper,
            },
            containerExpanded: {
                ...ReactReaderStyle.containerExpanded,
            },
            loadingView: {
                ...ReactReaderStyle.loadingView,
            },
        }),
        [isMobile, isMobileHorizontal, isDark]
    );
}
