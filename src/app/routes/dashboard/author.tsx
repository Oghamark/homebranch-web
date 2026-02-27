import {AuthorPage} from "@/pages/author";
import type {Route} from "./+types/author";
import {useEffect, useMemo} from "react";
import {Stack, Heading} from "@chakra-ui/react";
import {useGetBooksByAuthorInfiniteQuery} from "@/entities/author";
import {BookGridSkeletons} from "@/pages/library";
import {useLibrarySearch} from "@/features/library";
import {handleRtkError} from "@/shared/api/rtk-query";

export function meta({params}: Route.MetaArgs) {
    return [
        {title: `Homebranch - ${params.authorName}`},
        {name: "description", content: `Books by ${params.authorName}`},
    ];
}

export default function Author({params}: Route.ComponentProps) {
    const authorName = decodeURIComponent(params.authorName);
    const query = useLibrarySearch();
    const {data, hasNextPage, fetchNextPage, isLoading, error} = useGetBooksByAuthorInfiniteQuery({
        authorName,
        query,
    });

    useEffect(() => {
        if (error) {
            handleRtkError(error);
        }
    }, [error]);

    const books = useMemo(() => {
        return data?.pages.flatMap(page => page.data) ?? [];
    }, [data]);

    if (!isLoading && books.length === 0) {
        return _noBooks(authorName);
    }

    return (
        <Stack gap={4}>
            {isLoading
                ? <BookGridSkeletons/>
                : <AuthorPage authorName={authorName} books={books} fetchMore={fetchNextPage} hasMore={hasNextPage ?? false} totalBooks={data?.pages[0]?.total}/>
            }
        </Stack>
    );
}

function _noBooks(authorName: string) {
    return (
        <Stack height={"100%"} alignItems={"center"} justifyContent={"center"} gap={4}>
            <Heading>No books found for {authorName}</Heading>
        </Stack>
    );
}
