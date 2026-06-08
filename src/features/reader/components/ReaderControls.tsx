import { Flex, IconButton } from "@chakra-ui/react";
import { LuX, LuList, LuChevronLeft, LuChevronRight } from "react-icons/lu";
import { useNavigate } from "react-router";
import { useState } from "react";
import type { EpubNavigator } from "@readium/navigator";
import type { Link } from "@readium/shared";
import type { ReaderThemeState, ThemeColors } from "../types/ReaderTheme";
import { ReaderSettingsMenu } from "./ReaderSettingsMenu";
import { ReaderToc, type ReaderTocItem } from "./ReaderToc";

interface TocDrawerItem extends ReaderTocItem {
    link: Link;
    children?: TocDrawerItem[];
}

interface ReaderControlsProps {
    themeState: ReaderThemeState;
    colors: ThemeColors;
    showKeyboardHint: boolean;
    isMobile: boolean;
    isChapterTransitioning: boolean;
    tocItems: Link[];
    navigatorRef: React.RefObject<EpubNavigator | null>;
}

export function ReaderControls({
    themeState,
    colors,
    showKeyboardHint,
    isMobile,
    isChapterTransitioning,
    tocItems,
    navigatorRef,
}: ReaderControlsProps) {
    const navigate = useNavigate();
    const [isTocOpen, setIsTocOpen] = useState(false);

    const hintBg =
        themeState.mode === "dark"
            ? "rgba(45, 55, 72, 0.9)"
            : themeState.mode === "sepia"
              ? "rgba(91, 70, 54, 0.9)"
              : "rgba(74, 85, 104, 0.9)";

    const goBackward = () => navigatorRef.current?.goBackward(false, () => {});
    const goForward = () => navigatorRef.current?.goForward(false, () => {});
    const tocItemsForDrawer: TocDrawerItem[] = tocItems.map(function mapLink(link, index, items): TocDrawerItem {
        return {
            id: `${items.length}-${index}`,
            label: link.title ?? link.href ?? "Untitled",
            link,
            children: (link.children?.items ?? []).map(mapLink),
        };
    });

    return (
        <>
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
                isNavigationDisabled={isChapterTransitioning}
                tocItems={tocItemsForDrawer}
                getChildren={(item) => item.children}
                onNavigate={(item) => {
                    if (item.link.href) {
                        navigatorRef.current?.goLink(item.link, false, () => {});
                    }
                }}
                colors={colors}
            />

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
                onClick={() => navigate(-1)}
            >
                <LuX />
            </IconButton>

            {/* Side navigation arrows — hidden on mobile */}
            {!isMobile && (
                <>
                    <IconButton
                        aria-label={themeState.scroll ? "Previous chapter" : "Previous page"}
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
                        _disabled={{ opacity: 0.35, cursor: "default" }}
                        disabled={isChapterTransitioning}
                        onClick={goBackward}
                    >
                        <LuChevronLeft />
                    </IconButton>
                    <IconButton
                        aria-label={themeState.scroll ? "Next chapter" : "Next page"}
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
                        _disabled={{ opacity: 0.35, cursor: "default" }}
                        disabled={isChapterTransitioning}
                        onClick={goForward}
                    >
                        <LuChevronRight />
                    </IconButton>
                </>
            )}

            {showKeyboardHint && !isMobile && (
                <Flex
                    position="fixed"
                    bottom={6}
                    left="50%"
                    transform="translateX(-50%)"
                    zIndex={1001}
                    bg={hintBg}
                    color="white"
                    px={4}
                    py={2}
                    borderRadius="full"
                    fontSize="sm"
                    boxShadow="lg"
                    animation="fadeIn 0.3s ease-in"
                >
                    Use arrow keys or buttons to turn pages
                </Flex>
            )}
        </>
    );
}
