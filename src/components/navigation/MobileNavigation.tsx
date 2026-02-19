import {Box, CloseButton, Drawer, Flex, Heading, IconButton, Portal, Separator} from "@chakra-ui/react";
import {LuBookOpen, LuMenu} from "react-icons/lu";
import {useLocation} from "react-router";
import {useCallback, useEffect, useRef, useState} from "react";
import {NavigationContent} from "./NavigationContent";
import {useMobileNav} from "./MobileNavContext";

const pathnameToTitle: Record<string, string> = {
    "/": "Library",
    "/currently-reading": "Currently Reading",
    "/favorites": "Favorites",
    "/settings": "Account Settings",
    "/users": "User Management",
};

function getDefaultTitle(pathname: string): string {
    if (pathnameToTitle[pathname]) return pathnameToTitle[pathname];
    if (pathname.startsWith("/books/") && !pathname.endsWith("/read")) return "Book Details";
    if (pathname.startsWith("/create-book")) return "Create Book";
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
    const {title: contextTitle, rightAction} = useMobileNav();
    const headerVisible = useScrollDirection();

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
            >
                <Flex
                    align="center"
                    justify="space-between"
                    px={4}
                    py={2}
                    bg="bg"
                    borderBottomWidth="1px"
                >
                    <Flex align="center" gap={2}>
                        <IconButton
                            variant="ghost"
                            size="sm"
                            aria-label="Open navigation"
                            onClick={() => setOpen(true)}
                        >
                            <LuMenu/>
                        </IconButton>
                        <Heading size="md">{displayTitle}</Heading>
                    </Flex>
                    {rightAction && (
                        <Flex align="center">
                            {rightAction}
                        </Flex>
                    )}
                </Flex>
            </Box>
            {/* Spacer to prevent content from hiding behind fixed header */}
            <Box display={{base: "block", md: "none"}} h="48px"/>

            <Drawer.Root open={open} onOpenChange={(e) => setOpen(e.open)} placement="start">
                <Portal>
                    <Drawer.Backdrop/>
                    <Drawer.Positioner>
                        <Drawer.Content>
                            <Drawer.Header>
                                <Flex align="center" gap={2}>
                                    <LuBookOpen size={28}/>
                                    <Heading size="lg">HomeBranch</Heading>
                                </Flex>
                                <Drawer.CloseTrigger asChild>
                                    <CloseButton size="sm"/>
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
