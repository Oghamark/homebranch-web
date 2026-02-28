import {BookGridSkeletons, LibraryPage} from "@/pages/library";
import type {Route} from "./+types/shared-library";
import {useMemo} from "react";
import {Flex, Heading, Stack} from "@chakra-ui/react";
import {useGetBooksInfiniteQuery} from "@/entities/book";
import {useLibrarySearch} from "@/features/library";
import {LuUsers} from "react-icons/lu";

export function meta({}: Route.MetaArgs) {
    return [
        {title: "Homebranch - Shared Library"},
        {name: "description", content: "Browse all users' books"},
    ];
}

export default function SharedLibrary() {
    const query = useLibrarySearch();
    const {data, hasNextPage, fetchNextPage, isLoading} = useGetBooksInfiniteQuery({query});

    const books = useMemo(() => {
        return data?.pages.flatMap(page => page.data) ?? [];
    }, [data]);

    if (!isLoading && books.length === 0) {
        return (
            <Stack height={"100%"} alignItems={"center"} justifyContent={"center"} gap={4}>
                <Heading>No books in the shared library!</Heading>
            </Stack>
        );
    }

    return (
        <Stack gap={4}>
            <Flex align="center" gap={3} display={{base: "none", md: "flex"}}>
                <LuUsers size={24}/>
                <Heading size="2xl">Shared Library</Heading>
            </Flex>
            {isLoading
                ? <BookGridSkeletons/>
                : <LibraryPage books={books} fetchMore={fetchNextPage} hasMore={hasNextPage} totalBooks={data?.pages[0]?.total}/>
            }
        </Stack>
    );
}
