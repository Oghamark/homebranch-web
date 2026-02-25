import type { ReaderThemeState } from "../types/ReaderTheme";
import { getThemeColors } from "../types/ReaderTheme";
import {type IReactReaderStyle, ReactReader, ReactReaderStyle} from "react-reader";
import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {Box, Flex, IconButton, Spinner, Text, useMediaQuery} from "@chakra-ui/react";
import {useNavigate} from "react-router";
import {config} from "@/shared";
import ToastFactory from "@/app/utils/toast_handler";
import {LuX} from "react-icons/lu";
import type {Rendition} from "epubjs";
import type {NavItem} from "epubjs/types/navigation";
import type {BookModel} from "@/entities/book/model/BookModel";
import {getSavedPosition, savePosition} from "../api/savedPositionApi";
import {useDeviceName} from "../hooks/useDeviceName";
import {useSavePositionSync} from "../hooks/useSavePositionSync";
import type {SavedPosition} from "@/features/reader";
import {JumpToSavedPositionModal, type ModalCase} from "@/features/reader";
import { useAppSelector } from "@/app/hooks";
import { ReaderSettingsMenu } from "./ReaderSettingsMenu";

function getInitialLocation(bookId: string): string | number {
    if (typeof window === "undefined") return 0;
    const savedLocation = JSON.parse(
        localStorage.getItem(`currentlyReading_${sessionStorage.getItem("user_id")}`) ?? "{}",
    )[bookId];
    return savedLocation ?? 0;
}

const KEYBOARD_HINT_KEY = "reader-keyboard-hint-shown";

function applyRenditionTheme(rendition: Rendition, themeState: ReaderThemeState) {
    const colors = getThemeColors(themeState.mode);

    rendition.themes.override("color", colors.contentText);
    rendition.themes.override("background", colors.contentBg);

    rendition.themes.fontSize(`${themeState.fontSize ?? 100}%`);
    if (themeState.fontFamily !== 'System Default') {
        rendition.themes.font(themeState.fontFamily);
    } else {
        rendition.themes.font('inherit');
    }
}

function resolvePositionLabel(cfi: string, toc: NavItem[], spineGetter: (index: number) => {
    href: string
} | null): string {
    if (!cfi) return "Start of book";

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
    // Completely detached from global colorMode to respect reader preferences
    const navigate = useNavigate();
    const deviceName = useDeviceName();
    const themeState = useAppSelector(state => state.readerTheme);
    const colors = getThemeColors(themeState.mode);

    const [location, setLocation] = useState<string | number>(getInitialLocation(book.id));
    const renditionRef = useRef<Rendition | null>(null);
    const themeStateRef = useRef(themeState);
    themeStateRef.current = themeState;
    const pendingServerPosRef = useRef<SavedPosition | null>(null);

    const [isMobile] = useMediaQuery(["(max-width: 768px)"]);

    const [showKeyboardHint, setShowKeyboardHint] = useState(() => {
        if (typeof window === "undefined") return false;
        return !localStorage.getItem(KEYBOARD_HINT_KEY);
    });

    const [modalCase, setModalCase] = useState<ModalCase | null>(null);

    const readerTheme = useResponsiveReaderTheme(themeState.mode);
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
        applyRenditionTheme(rendition, themeState);
    }, [themeState]);

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
        applyRenditionTheme(rendition, themeStateRef.current);

        const pending = pendingServerPosRef.current;
        if (pending) {
            pendingServerPosRef.current = null;
            rendition.book.loaded.navigation.then(() => {
                buildModalCase(pending, rendition);
            });
        }
    }, [buildModalCase]);

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
                bg={colors.bg}
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
                            <Spinner size="lg" color={colors.muted}/>
                            <Text color={colors.muted} fontSize="sm">
                                Loading book...
                            </Text>
                        </Flex>
                    }
                />
            </Box>
            <ReaderSettingsMenu />
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
                _hover={{
                    bg: colors.btnHoverBg,
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
                    bg={themeState.mode === 'dark' ? "rgba(45, 55, 72, 0.9)" : themeState.mode === 'sepia' ? "rgba(91, 70, 54, 0.9)" : "rgba(74, 85, 104, 0.9)"}
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

function useResponsiveReaderTheme(themeMode: ReaderThemeState['mode']): IReactReaderStyle {
    const [isSmallScreen] = useMediaQuery([
        "(max-width: 768px)",
    ]);

    return useMemo(
        () => {
            const colors = getThemeColors(themeMode);

            return {
                ...ReactReaderStyle,
                container: {
                    ...ReactReaderStyle.container,
                    backgroundColor: colors.bg,
                },
                readerArea: {
                    ...ReactReaderStyle.readerArea,
                    backgroundColor: colors.bg,
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
                    color: colors.muted,
                    ...(isSmallScreen && {
                        top: 8,
                        left: 16,
                        right: 16,
                        fontSize: "0.85em",
                    }),
                },
                arrow: {
                    ...ReactReaderStyle.arrow,
                    color: colors.muted,
                    ...(isSmallScreen && {
                        display: "none",
                    }),
                },
                arrowHover: {
                    ...ReactReaderStyle.arrowHover,
                    color: colors.hoverText,
                    background: colors.hoverBg,
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
                    backgroundColor: colors.uiBg,
                },
                tocAreaButton: {
                    ...ReactReaderStyle.tocAreaButton,
                    color: colors.hoverText,
                    borderBottom: `1px solid ${colors.uiBorder}`,
                    padding: "10px 16px",
                },
                tocButtonExpanded: {
                    ...ReactReaderStyle.tocButtonExpanded,
                    background: colors.uiBorder,
                },
                tocButton: {
                    ...ReactReaderStyle.tocButton,
                },
                tocButtonBar: {
                    ...ReactReaderStyle.tocButtonBar,
                    background: colors.muted,
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
            };
        },
        [isSmallScreen, themeMode],
    );
}
