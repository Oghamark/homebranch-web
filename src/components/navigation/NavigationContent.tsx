import {AddBookButton} from "@/entities/book";
import {Box, Button, For, Separator, Spinner, Stack, Tabs, Text} from "@chakra-ui/react";
import {LuBookOpen, LuHeart, LuLibrary, LuLogOut, LuSettings, LuUsers} from "react-icons/lu";
import {Link, useFetcher, useLocation} from "react-router";
import {BookShelfNavigationSection} from "@/entities/bookShelf";
import {SearchLibrary} from "@/features/library";
import type {IconType} from "react-icons";

interface NavigationContentProps {
    onNavigate?: () => void;
}

const links: { to: string; label: string; icon: IconType }[] = [
    {to: "/", label: "Library", icon: LuLibrary},
    {to: "/currently-reading", label: "Currently Reading", icon: LuBookOpen},
    {to: "/favorites", label: "Favorites", icon: LuHeart},
];

export function NavigationContent({onNavigate}: NavigationContentProps) {
    const location = useLocation();
    const fetcher = useFetcher();
    let busy = fetcher.state !== 'idle';

    return (
        <>
            <Box
                flex="1"
                minH="0"
                overflowY="auto"
                scrollbarWidth="none"
                css={{"&::-webkit-scrollbar": {display: "none"}}}
            >
                <Stack gap={2}>
                    <SearchLibrary/>
                    <Tabs.Root
                        orientation="vertical"
                        variant={"subtle"}
                        value={location.pathname}
                    >
                        <Tabs.List width={"100%"}>
                            <For each={links}>
                                {(link) => (
                                    <Tabs.Trigger value={link.to} asChild>
                                        <Link to={link.to} onClick={onNavigate}>
                                            <link.icon size={16}/>
                                            {link.label}
                                        </Link>
                                    </Tabs.Trigger>
                                )}
                            </For>
                        </Tabs.List>
                    </Tabs.Root>
                    <AddBookButton/>
                </Stack>
                <Separator my={4}/>
                <Text fontWeight="medium" fontSize="sm" color="fg.muted" mb={2}>Book Shelves</Text>
                <BookShelfNavigationSection onNavigate={onNavigate}/>
                <Separator my={4}/>
                <Tabs.Root
                    orientation="vertical"
                    variant={"subtle"}
                    value={location.pathname}
                >
                    <Tabs.List width={"100%"}>
                        <Tabs.Trigger value={"/settings"} asChild>
                            <Link to={"/settings"} onClick={onNavigate}><LuSettings size={16}/> Settings</Link>
                        </Tabs.Trigger>
                        <Tabs.Trigger value={"/users"} asChild>
                            <Link to={"/users"} onClick={onNavigate}><LuUsers size={16}/> User Management</Link>
                        </Tabs.Trigger>
                    </Tabs.List>
                </Tabs.Root>
            </Box>
            <Separator my={4}/>
            <Button
                variant={"outline"}
                width="100%"
                flexShrink={0}
                onClick={() => fetcher.submit('', {method: 'post', action: '/logout'})}
            >
                {busy ? <Spinner/> : <><LuLogOut/> Log out</>}
            </Button>
        </>
    );
}
