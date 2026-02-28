import {BookGridSkeletons, LibraryPage} from "@/pages/library";
import type {Route} from "./+types/library";
import {useEffect, useMemo, useState} from "react";
import {Flex, Heading, Stack, Switch, Text} from "@chakra-ui/react";
import {useGetBooksInfiniteQuery} from "@/entities/book";
import {useLibrarySearch} from "@/features/library";
import {LuLibrary} from "react-icons/lu";
import {cleanupStaleLocationCaches} from "@/features/reader";

export function meta({}: Route.MetaArgs) {
    return [
        {title: "Homebranch - Library"},
        {name: "description", content: "Welcome to React Router!"},
    ];
}

export default function Library() {
    const query = useLibrarySearch();
    const [showAll, setShowAll] = useState(false);
    const userId = showAll ? undefined : (sessionStorage.getItem('user_id') ?? undefined);
    const {data, hasNextPage, fetchNextPage, isLoading} = useGetBooksInfiniteQuery({query, userId});

    const books = useMemo(() => {
        return data?.pages.flatMap(page => page.data) ?? []
    }, [data])

    useEffect(() => {
        if (!isLoading && !hasNextPage) {
            const allIds = data?.pages.flatMap(page => page.data.map(b => b.id)) ?? [];
            cleanupStaleLocationCaches(allIds);
        }
    }, [isLoading, hasNextPage, data]);

    if (!isLoading && books.length === 0) {
        return _noBooks(showAll, setShowAll)
    }

    return (
        <Stack gap={4}>
            <Flex align="center" gap={3} display={{base: "none", md: "flex"}}>
                <LuLibrary size={24}/>
                <Heading size="2xl">Library</Heading>
                <Switch.Root
                    ml="auto"
                    checked={showAll}
                    onCheckedChange={(e) => setShowAll(e.checked)}
                >
                    <Switch.HiddenInput/>
                    <Switch.Control><Switch.Thumb/></Switch.Control>
                    <Switch.Label><Text fontSize="sm">Show all users</Text></Switch.Label>
                </Switch.Root>
            </Flex>
            {isLoading
                ? <BookGridSkeletons/>
                : <LibraryPage books={books} fetchMore={fetchNextPage} hasMore={hasNextPage} totalBooks={data?.pages[0]?.total}/>
            }
        </Stack>
    );
}

function _noBooks(showAll: boolean, setShowAll: (v: boolean) => void) {
    return (
        <Stack height={"100%"} alignItems={"center"} justifyContent={"center"} gap={4}>
            <Heading>{showAll ? "No books found!" : "You don't have any books in your library!"}</Heading>
            {showAll
                ? null
                : <Flex align="center" gap={2}>
                    <Text>Show books from all users?</Text>
                    <Switch.Root checked={showAll} onCheckedChange={(e) => setShowAll(e.checked)}>
                        <Switch.HiddenInput/>
                        <Switch.Control><Switch.Thumb/></Switch.Control>
                    </Switch.Root>
                  </Flex>
            }
            {!showAll && <Heading>Add some books to see them here</Heading>}
        </Stack>
    )
}
