import {Button, Flex, Heading, Stack} from "@chakra-ui/react";
import {Link} from "react-router";
import type {Route} from "./+types/favorites";
import {BookGridSkeletons, LibraryPage} from "@/pages/library";
import {useGetFavoriteBooksInfiniteQuery} from "@/entities/book";
import {useMemo} from "react";
import {
    LibraryDisplayOptions,
    LibraryDisplayToggleButton,
    setDisplayMode,
    useLibraryDisplayMode,
    useLibrarySearch
} from "@/features/library";
import {LuHeart} from "react-icons/lu";
import {useAppDispatch} from "@/app/hooks";
import {useMobileNavConfig} from "@/components/navigation/MobileNavContext";

export function meta({}: Route.MetaArgs) {
    return [
        {title: "Homebranch - Favorites"},
        {name: "description", content: "Welcome to React Router!"},
    ];
}

export default function Favorites() {
    const dispatch = useAppDispatch();
    const displayMode = useLibraryDisplayMode();
    const query = useLibrarySearch()
    const {data, hasNextPage, fetchNextPage, isLoading} = useGetFavoriteBooksInfiniteQuery({query: query});
    const mobileNavRightAction = useMemo(() => (
        <LibraryDisplayToggleButton
            displayMode={displayMode}
            onDisplayModeChange={(mode) => dispatch(setDisplayMode(mode))}
        />
    ), [displayMode, dispatch]);

    useMobileNavConfig(
        "Favorites",
        mobileNavRightAction
    );

    const books = useMemo(() => {
        return data?.pages.flatMap(page => page.data) ?? []
    }, [data])

    if (!isLoading && (!data || books.length === 0)) {
        return _noBooks()
    }

    return (
        <Stack gap={4}>
            <Flex align="center" gap={3} display={{base: "none", md: "flex"}} justify="space-between">
                <Flex align="center" gap={3}>
                    <LuHeart size={24}/>
                    <Heading size="2xl">Favorites</Heading>
                </Flex>
                <LibraryDisplayOptions
                    displayMode={displayMode}
                    onDisplayModeChange={(mode) => dispatch(setDisplayMode(mode))}
                />
            </Flex>
            {isLoading
                ? <BookGridSkeletons displayMode={displayMode}/>
                : <LibraryPage
                    books={books}
                    fetchMore={fetchNextPage}
                    hasMore={hasNextPage}
                    totalBooks={data?.pages[0]?.total}
                    displayMode={displayMode}
                />
            }
        </Stack>
    );
}

function _noBooks() {
    return (
        <Stack
            height={"100%"}
            alignItems={"center"}
            justifyContent={"center"}
            gap={4}
        >
            <Heading>You don't have any favorited books!</Heading>
            <Link to={"/"}>
                <Button>Go to Library</Button>
            </Link>
        </Stack>
    );
}
