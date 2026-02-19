import {Button, Flex, Heading, Stack} from "@chakra-ui/react";
import {Link} from "react-router";
import type {Route} from "./+types/favorites";
import {BookGridSkeletons, LibraryPage} from "@/pages/library";
import {useGetFavoriteBooksInfiniteQuery} from "@/entities/book";
import {useMemo} from "react";
import {useLibrarySearch} from "@/features/library";
import {LuHeart} from "react-icons/lu";

export function meta({}: Route.MetaArgs) {
    return [
        {title: "Homebranch - Favorites"},
        {name: "description", content: "Welcome to React Router!"},
    ];
}

export default function Favorites() {
    const query = useLibrarySearch()
    const {data, hasNextPage, fetchNextPage, isLoading} = useGetFavoriteBooksInfiniteQuery({query: query});

    const books = useMemo(() => {
        return data?.pages.flatMap(page => page.data) ?? []
    }, [data])

    if (!isLoading && (!data || books.length === 0)) {
        return _noBooks()
    }

    return (
        <Stack gap={4}>
            <Flex align="center" gap={3} display={{base: "none", md: "flex"}}>
                <LuHeart size={24}/>
                <Heading size="2xl">Favorites</Heading>
            </Flex>
            {isLoading
                ? <BookGridSkeletons/>
                : <LibraryPage books={books} fetchMore={fetchNextPage} hasMore={hasNextPage} totalBooks={data?.pages[0]?.total}/>
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
