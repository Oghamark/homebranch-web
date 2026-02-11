import {Button, Heading, Stack} from "@chakra-ui/react";
import {Link} from "react-router";
import type {Route} from "./+types/favorites";
import {LibraryPage} from "@/pages/library";
import {useGetFavoriteBooksInfiniteQuery} from "@/entities/book";
import {useMemo} from "react";
import {useLibrarySearch} from "@/features/library";

export function meta({}: Route.MetaArgs) {
    return [
        {title: "Homebranch - Favorites"},
        {name: "description", content: "Welcome to React Router!"},
    ];
}

export default function Favorites() {
    const query = useLibrarySearch()
    const {data, hasNextPage, fetchNextPage} = useGetFavoriteBooksInfiniteQuery({query: query});

    const books = useMemo(() => {
        return data?.pages.flatMap(page => page.data) ?? []
    }, [data])

    if (!data || data.pages.length === 0) {
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
            <Heading>You don't have any favorited books!</Heading>
            <Link to={"/"}>
                <Button>Go to Library</Button>
            </Link>
        </Stack>
    );
}
