import {Box, CloseButton, Drawer, Flex, Heading, IconButton, Portal, Separator} from "@chakra-ui/react";
import {LuMenu} from "react-icons/lu";
import {useLocation} from "react-router";
import {useCallback, useEffect, useRef, useState} from "react";
import {NavigationContent} from "./NavigationContent";
import {useMobileNav} from "./MobileNavContext";
import {ShowAllUsersButton} from "@/features/library";
import {useColorMode, ColorModeButton} from "@/shared/ui/color-mode";

const pathnameToTitle: Record<string, string> = {
    "/": "Library",
    "/currently-reading": "Continue reading",
    "/favorites": "Favorites",
    "/settings": "Account Settings",
    "/users": "User Management",
    "/authors": "Authors",
    "/library-management": "Library management",
    "/book-clubs": "Book clubs",
    "/friends": "Friends",
    "/notifications": "Notifications",
};

function getDefaultTitle(pathname: string): string {
    if (pathnameToTitle[pathname]) return pathnameToTitle[pathname];
    if (pathname.startsWith("/books/") && !pathname.endsWith("/read")) return "Book Details";
    if (pathname.startsWith("/authors/")) return "Author";
    if (pathname.startsWith("/book-shelves/")) return "Bookshelf";
    if (pathname.startsWith("/book-clubs/")) return "Book clubs";
    return "HomeBranch";
}

function useScrollDirection() {
    const [visible, setVisible] = useState(true);
    const lastScrollY = useRef(0);

    const handleScroll = useCallback(() => {
        const currentScrollY = window.scrollY;
        if (currentScrollY <= 0) {
            setVisible(true);
        } else if (currentScrollY < lastScrollY.current) {
            setVisible(true);
        } else if (currentScrollY > lastScrollY.current) {
            setVisible(false);
        }
        lastScrollY.current = currentScrollY;
    }, []);

    useEffect(() => {
        window.addEventListener("scroll", handleScroll, {passive: true});
        return () => window.removeEventListener("scroll", handleScroll);
    }, [handleScroll]);

    return visible;
}

export function MobileNavigation() {
    const [open, setOpen] = useState(false);
    const location = useLocation();
    const {title: contextTitle, rightAction, showUserToggle} = useMobileNav();
    const headerVisible = useScrollDirection();
    const {colorMode} = useColorMode();
    const logoSrc = colorMode === "dark"
        ? "/Logo%20Monochrome%20For%20Dark.svg"
        : "/Logo%20Monochrome%20For%20Light.svg";

    const isReaderPage = /^\/books\/[^/]+\/read$/.test(location.pathname);

    useEffect(() => {
        setOpen(false);
    }, [location.pathname]);

    if (isReaderPage) return null;

    const displayTitle = contextTitle ?? getDefaultTitle(location.pathname);

    return (
        <>
            <Box
                display={{base: "block", md: "none"}}
                position="fixed"
                top={0}
                left={0}
                right={0}
                zIndex="sticky"
                transform={headerVisible ? "translateY(0)" : "translateY(-100%)"}
                transition="transform 0.2s ease"
                css={{"@media (prefers-reduced-motion: reduce)": {transition: "none"}}}
            >
                <Flex
                    align="center"
                    justify="space-between"
                    px={4}
                    py={2}
                    pt="max(8px, env(safe-area-inset-top))"
                    bg="bg"
                    borderBottomWidth="1px"
                >
                    <Flex align="center" gap={2} minW={0} flex={1}>
                        <IconButton
                            variant="ghost"
                            size="sm"
                            minH="44px"
                            minW="44px"
                            aria-label="Open navigation"
                            onClick={() => setOpen(true)}
                        >
                            <LuMenu/>
                        </IconButton>
                        <Heading as="p" size="md" lineClamp={1} minW={0}>{displayTitle}</Heading>
                    </Flex>
                    <Flex align="center" gap={1} flexShrink={0}>
                            {rightAction}
                            {showUserToggle && <ShowAllUsersButton/>}
                            <ColorModeButton/>
                        </Flex>
                </Flex>
            </Box>
            {/* Spacer to prevent content from hiding behind fixed header */}
            <Box display={{base: "block", md: "none"}} h="calc(60px + env(safe-area-inset-top))"/>

            <Drawer.Root open={open} onOpenChange={(e) => setOpen(e.open)} placement="start">
                <Portal>
                    <Drawer.Backdrop/>
                    <Drawer.Positioner>
                        <Drawer.Content>
                            <Drawer.Header>
                                <Drawer.Title srOnly>Navigation</Drawer.Title>
                                <img src={logoSrc} alt="HomeBranch" style={{height: "36px"}}/>
                                <Drawer.CloseTrigger asChild>
                                    <CloseButton size="sm" minH="44px" minW="44px" aria-label="Close navigation"/>
                                </Drawer.CloseTrigger>
                            </Drawer.Header>
                            <Separator/>
                            <Drawer.Body display="flex" flexDirection="column" px={4} py={4}>
                                <NavigationContent onNavigate={() => setOpen(false)}/>
                            </Drawer.Body>
                        </Drawer.Content>
                    </Drawer.Positioner>
                </Portal>
            </Drawer.Root>
        </>
    );
}
