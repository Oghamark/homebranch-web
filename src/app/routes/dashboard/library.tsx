import {LibraryPage} from "@/pages/library";
import type {Route} from "./+types/library";
import {useMemo} from "react";
import {Heading, Stack} from "@chakra-ui/react";
import {useGetBooksInfiniteQuery} from "@/entities/book";
import {useLibrarySearch} from "@/features/library";

export function meta({}: Route.MetaArgs) {
    return [
        {title: "Homebranch - Library"},
        {name: "description", content: "Welcome to React Router!"},
    ];
}

export default function Library() {
    const query = useLibrarySearch();
    const {data, hasNextPage, fetchNextPage, isLoading} = useGetBooksInfiniteQuery({query: query});

    const books = useMemo(() => {
        return data?.pages.flatMap(page => page.data) ?? []
    }, [data])

    if (!isLoading && books.length === 0) {
        return _noBooks()
    }

    return <LibraryPage books={books} fetchMore={fetchNextPage} hasMore={hasNextPage}/>;
}

function _noBooks() {
    return (
        <Stack
            height={"100%"}
            alignItems={"center"}
            justifyContent={"center"}
            gap={4}
        >
            <Heading>You don't have any books in your library!</Heading>
            <Heading>Add some books to see them here</Heading>
        </Stack>
    )
}
