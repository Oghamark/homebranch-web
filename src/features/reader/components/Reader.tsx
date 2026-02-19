import {type IReactReaderStyle, ReactReader, ReactReaderStyle} from "react-reader";
import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {Box, Flex, IconButton, Spinner, Text, useMediaQuery} from "@chakra-ui/react";
import {useNavigate} from "react-router";
import {config} from "@/shared";
import ToastFactory from "@/app/utils/toast_handler";
import {useColorMode} from "@/components/ui/color-mode";
import {LuX} from "react-icons/lu";
import type {Rendition} from "epubjs";
import type {NavItem} from "epubjs/types/navigation";
import type {BookModel} from "@/entities/book/model/BookModel";
import {getSavedPosition, savePosition} from "../api/savedPositionApi";
import {useDeviceName} from "../hooks/useDeviceName";
import {useSavePositionSync} from "../hooks/useSavePositionSync";
import {JumpToSavedPositionModal, type ModalCase} from "./JumpToSavedPositionModal";
import type {SavedPosition} from "../types/SavedPosition";

function getInitialLocation(bookId: string): string | number {
    if (typeof window === "undefined") return 0;
    const savedLocation = JSON.parse(
        localStorage.getItem("currentlyReading") ?? "{}",
    )[bookId];
    return savedLocation ?? 0;
}

const KEYBOARD_HINT_KEY = "reader-keyboard-hint-shown";

function resolvePositionLabel(cfi: string, toc: NavItem[], spineGetter: (index: number) => {href: string} | null): string {
    if (!cfi || typeof cfi !== "string") return "Start of book";

    const match = cfi.match(/^epubcfi\(\/\d+\/(\d+)!?\/?(.*)?\)$/);
    if (!match) return "Start of book";

    const spineIndex = Math.floor(parseInt(match[1], 10) / 2) - 1;
    const contentPath = match[2] ?? "";

    const steps = contentPath.match(/\/(\d+)/g)?.map((s) => parseInt(s.slice(1), 10)) ?? [];
    const pageStep = steps.length >= 2 ? steps[steps.length - 2] : null;
    const page = pageStep !== null ? Math.max(1, Math.floor(pageStep / 2)) : null;

    const section = spineGetter(spineIndex);
    if (!section) {
        const label = `Chapter ${spineIndex + 1}`;
        return page ? `${label}, Page ${page}` : label;
    }

    const sectionHref = section.href.split("#")[0];

    function findInToc(items: NavItem[]): string | null {
        for (const item of items) {
            const tocHref = item.href.split("#")[0];
            if (tocHref === sectionHref || sectionHref.endsWith(tocHref) || tocHref.endsWith(sectionHref)) {
                return item.label.trim();
            }
            if (item.subitems?.length) {
                const found = findInToc(item.subitems);
                if (found) return found;
            }
        }
        return null;
    }

    let chapterLabel = findInToc(toc);

    if (!chapterLabel) {
        for (const item of flattenToc(toc)) {
            const tocHref = item.href.split("#")[0];
            for (let i = 0; i <= spineIndex; i++) {
                const s = spineGetter(i);
                if (s) {
                    const sHref = s.href.split("#")[0];
                    if (sHref === tocHref || sHref.endsWith(tocHref) || tocHref.endsWith(sHref)) {
                        chapterLabel = item.label.trim();
                    }
                }
            }
        }
    }

    chapterLabel = chapterLabel ?? `Chapter ${spineIndex + 1}`;
    return page ? `${chapterLabel}, Page ${page}` : chapterLabel;
}

function flattenToc(items: NavItem[]): NavItem[] {
    const result: NavItem[] = [];
    for (const item of items) {
        result.push(item);
        if (item.subitems?.length) {
            result.push(...flattenToc(item.subitems));
        }
    }
    return result;
}

interface ReaderProps {
    book: BookModel;
}

export function Reader({book}: ReaderProps) {
    const {colorMode} = useColorMode();
    const isDark = colorMode === "dark";
    const navigate = useNavigate();
    const deviceName = useDeviceName();

    const [location, setLocation] = useState<string | number>(getInitialLocation(book.id));
    const renditionRef = useRef<Rendition | null>(null);
    const pendingServerPosRef = useRef<SavedPosition | null>(null);

    const [isMobile] = useMediaQuery(["(max-width: 768px)"]);

    const [showKeyboardHint, setShowKeyboardHint] = useState(() => {
        if (typeof window === "undefined") return false;
        return !localStorage.getItem(KEYBOARD_HINT_KEY);
    });

    const [modalCase, setModalCase] = useState<ModalCase | null>(null);

    const readerTheme = useResponsiveReaderTheme(isDark);
    const {onLocationChange} = useSavePositionSync(book.id, deviceName);

    const buildModalCase = useCallback((serverPos: SavedPosition, rendition: Rendition) => {
        const localPos = getInitialLocation(book.id);
        const hasLocalPosition = localPos !== 0;

        if (String(serverPos.position) === String(localPos)) return;

        const toc = rendition.book.navigation.toc;
        const spineGetter = (index: number) => {
            try {
                return rendition.book.spine.get(index);
            } catch {
                return null;
            }
        };

        const serverLabel = resolvePositionLabel(serverPos.position, toc, spineGetter);

        if (hasLocalPosition && serverPos.deviceName === deviceName) {
            const localLabel = resolvePositionLabel(String(localPos), toc, spineGetter);
            setModalCase({
                type: "conflict",
                serverPosition: serverPos.position,
                localPosition: String(localPos),
                serverLabel,
                localLabel,
            });
        } else {
            setModalCase({
                type: "jump",
                deviceName: serverPos.deviceName,
                updatedAt: serverPos.updatedAt,
                serverPosition: serverPos.position,
                serverLabel,
            });
        }
    }, [book.id, deviceName]);

    useEffect(() => {
        let cancelled = false;

        async function checkServerPosition() {
            try {
                const serverPos = await getSavedPosition(book.id);
                if (cancelled) return;

                if (!serverPos) return;

                if (renditionRef.current) {
                    buildModalCase(serverPos, renditionRef.current);
                } else {
                    pendingServerPosRef.current = serverPos;
                }
            } catch {
                ToastFactory({message: "Unable to check cloud position", type: "warning"});
            }
        }

        checkServerPosition();
        return () => {
            cancelled = true;
        };
    }, [book.id, deviceName, buildModalCase]);

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

        const pending = pendingServerPosRef.current;
        if (pending) {
            pendingServerPosRef.current = null;
            rendition.book.loaded.navigation.then(() => {
                buildModalCase(pending, rendition);
            });
        }
    }, [isDark, buildModalCase]);

    const handleLocationChanged = useCallback(
        (newLocation: string | number) => {
            setLocation(newLocation);
            onLocationChange(newLocation);
        },
        [onLocationChange],
    );

    const handleJump = useCallback(
        (position: string) => {
            setLocation(position);
            onLocationChange(position);
            setModalCase(null);
        },
        [onLocationChange],
    );

    const handleKeepLocal = useCallback(async () => {
        setModalCase(null);
        try {
            await savePosition(book.id, String(location), deviceName);
        } catch {
            ToastFactory({message: "Failed to sync local position to cloud", type: "warning"});
        }
    }, [book.id, location, deviceName]);

    return (
        <>
            <Box
                h="100dvh"
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
                    locationChanged={handleLocationChanged}
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
        [isMobile, isMobileHorizontal, isDark],
    );
}
