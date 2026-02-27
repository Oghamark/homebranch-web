import {AuthorPage, AuthorPageSkeleton} from "@/pages/author";
import type {Route} from "./+types/author";
import {useEffect, useMemo} from "react";
import {Heading, Stack} from "@chakra-ui/react";
import {useGetAuthorQuery, useGetBooksByAuthorInfiniteQuery} from "@/entities/author";
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

    const {data: authorData, isLoading: isAuthorLoading, error: authorError} = useGetAuthorQuery(authorName);
    const {data, hasNextPage, fetchNextPage, isLoading: isBooksLoading, error: booksError} = useGetBooksByAuthorInfiniteQuery({
        authorName,
        query,
    });

    useEffect(() => {
        if (authorError) handleRtkError(authorError);
    }, [authorError]);

    useEffect(() => {
        if (booksError) handleRtkError(booksError);
    }, [booksError]);

    const books = useMemo(() => {
        return data?.pages.flatMap(page => page.data) ?? [];
    }, [data]);

    const isLoading = isBooksLoading;

    if (!isLoading && books.length === 0) {
        return _noBooks(authorName);
    }

    return (
        <Stack gap={4}>
            {isLoading
                ? <AuthorPageSkeleton/>
                : <AuthorPage
                    authorName={authorName}
                    biography={authorData?.biography}
                    profilePictureUrl={authorData?.profilePictureUrl}
                    books={books}
                    fetchMore={fetchNextPage}
                    hasMore={hasNextPage ?? false}
                    totalBooks={data?.pages[0]?.total}
                />
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
