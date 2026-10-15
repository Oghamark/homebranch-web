import {AddBookButton} from "@/entities/book";
import {Box, Button, Separator, Spinner, Stack, Text} from "@chakra-ui/react";
import {LuBookOpen, LuFolderSync, LuHeart, LuLibrary, LuLogOut, LuMessagesSquare, LuSettings, LuUser, LuUsers} from "react-icons/lu";
import {NavLink, useFetcher} from "react-router";
import {BookShelfNavigationSection} from "@/entities/bookShelf";
import type {IconType} from "react-icons";
import {ColorModeIcon, useColorMode} from "@/shared/ui/color-mode";
import {config} from "@/shared/config";

const links: {to: string; label: string; icon: IconType}[] = [
    {to: "/", label: "Library", icon: LuLibrary},
    {to: "/currently-reading", label: "Continue reading", icon: LuBookOpen},
    {to: "/favorites", label: "Favorites", icon: LuHeart},
    {to: "/authors", label: "Authors", icon: LuUser},
    {to: "/book-clubs", label: "Book clubs", icon: LuMessagesSquare},
];

export function NavigationContent({onNavigate}: {onNavigate?: () => void}) {
    const fetcher = useFetcher();
    const isAdmin = sessionStorage.getItem("user_role") === "ADMIN";
    const {colorMode, toggleColorMode} = useColorMode();

    function navigationLink({to, label, icon: Icon}: typeof links[number]) {
        return <Button key={to} asChild justifyContent="start" variant="ghost" minH="44px"
            css={{'&[aria-current="page"]': {background: "var(--chakra-colors-bg-emphasized)", fontWeight: "bold"}}}>
            <NavLink to={to} end={to === "/"} onClick={onNavigate}><Icon aria-hidden="true"/>{label}</NavLink>
        </Button>;
    }

    return <>
        <Box flex="1" minH="0" overflowY="auto">
            <Stack as="nav" aria-label="Reading" gap={1}>
                {links.map(navigationLink)}
            </Stack>
            <Box mt={3}><AddBookButton/></Box>
            <Separator my={4}/>
            <Text fontWeight="medium" fontSize="sm" color="fg.muted" mb={2}>Bookshelves</Text>
            <BookShelfNavigationSection onNavigate={onNavigate}/>
            <Separator my={4}/>
            <Stack as="nav" aria-label="Account and administration" gap={1}>
                {navigationLink({to: "/settings", label: "Settings", icon: LuSettings})}
                {(!config.cloudMode || isAdmin) && navigationLink({to: "/library-management", label: "Library management", icon: LuFolderSync})}
                {isAdmin && navigationLink({to: "/users", label: "User management", icon: LuUsers})}
            </Stack>
        </Box>
        <Separator my={4}/>
        <Stack gap={2} flexShrink={0}>
            <Button variant="ghost" minH="44px" justifyContent="start" onClick={toggleColorMode}>
                <ColorModeIcon/> {colorMode === "dark" ? "Dark mode" : "Light mode"}
            </Button>
            <Button variant="outline" minH="44px" disabled={fetcher.state !== "idle"}
                onClick={() => fetcher.submit("", {method: "post", action: "/logout"})}>
                {fetcher.state !== "idle" ? <Spinner/> : <LuLogOut/>} Log out
            </Button>
        </Stack>
    </>;
}
