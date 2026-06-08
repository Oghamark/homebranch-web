import {BookGridSkeletons, LibraryPage} from "@/pages/library";
import type {Route} from "./+types/library";
import {useMemo} from "react";
import {Flex, Heading, Stack} from "@chakra-ui/react";
import {useGetBooksInfiniteQuery} from "@/entities/book";
import {
    LibraryDisplayOptions,
    setBooksPerRow,
    setDisplayMode,
    useLibraryBooksPerRow,
    useLibraryDisplayMode,
    useLibrarySearch,
    useShowAllUsers,
    ShowAllUsersButton
} from "@/features/library";
import {LuLibrary} from "react-icons/lu";
import {useMobileNavUserToggle} from "@/components/navigation/MobileNavContext";
import {useAppDispatch} from "@/app/hooks";

export function meta({}: Route.MetaArgs) {
    return [
        {title: "Homebranch - Library"},
        {name: "description", content: "Welcome to React Router!"},
    ];
}

export default function Library() {
    useMobileNavUserToggle();
    const dispatch = useAppDispatch();
    const query = useLibrarySearch();
    const showAllUsers = useShowAllUsers();
    const displayMode = useLibraryDisplayMode();
    const booksPerRow = useLibraryBooksPerRow();
    const userId = showAllUsers ? undefined : (sessionStorage.getItem("user_id") ?? undefined);
    const {data, hasNextPage, fetchNextPage, isLoading} = useGetBooksInfiniteQuery({query, userId});

    const books = useMemo(() => {
        return data?.pages.flatMap(page => page.data) ?? [];
    }, [data]);

    const isEmpty = !isLoading && books.length === 0;

    return (
        <Stack gap={4} height="100%">
            <Flex align="center" gap={3} display={{base: "none", md: "flex"}} justify="space-between">
                <Flex align="center" gap={3}>
                    <LuLibrary size={24}/>
                    <Heading size="2xl">Library</Heading>
                </Flex>
                <Flex align="center" gap={2}>
                    <LibraryDisplayOptions
                        displayMode={displayMode}
                        booksPerRow={booksPerRow}
                        onDisplayModeChange={(mode) => dispatch(setDisplayMode(mode))}
                        onBooksPerRowChange={(value) => dispatch(setBooksPerRow(value))}
                    />
                    <ShowAllUsersButton showLabel/>
                </Flex>
            </Flex>
            <Flex display={{base: "flex", md: "none"}} justify="flex-end">
                <LibraryDisplayOptions
                    displayMode={displayMode}
                    booksPerRow={booksPerRow}
                    onDisplayModeChange={(mode) => dispatch(setDisplayMode(mode))}
                    onBooksPerRowChange={(value) => dispatch(setBooksPerRow(value))}
                />
            </Flex>
            {isLoading
                ? <BookGridSkeletons displayMode={displayMode} booksPerRow={booksPerRow}/>
                : isEmpty
                    ? <NoBooksMessage showAllUsers={showAllUsers}/>
                    : <LibraryPage
                        books={books}
                        fetchMore={fetchNextPage}
                        hasMore={hasNextPage}
                        totalBooks={data?.pages[0]?.total}
                        displayMode={displayMode}
                        booksPerRow={booksPerRow}
                    />
            }
        </Stack>
    );
}

function NoBooksMessage({showAllUsers}: { showAllUsers: boolean }) {
    const query = useLibrarySearch();
    const hasQuery = !!query;

    if (hasQuery) {
        return (
            <Stack flex={1} alignItems={"center"} justifyContent={"center"} gap={4}>
                <Heading>No books match your search.</Heading>
                <Heading size="md" color="fg.muted">Try a different title, author, or a keyword like isbn:9780...</Heading>
            </Stack>
        );
    }
    return (
        <Stack flex={1} alignItems={"center"} justifyContent={"center"} gap={4}>
            <Heading>{showAllUsers ? "No books have been added yet." : "You don't have any books in your library!"}</Heading>
            {!showAllUsers && <Heading size="md" color="fg.muted">Add some books, or switch to All Libraries to browse everyone{"'"}s collection.</Heading>}
        </Stack>
    );
}
