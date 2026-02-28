import {AuthorPage, AuthorPageSkeleton} from "@/pages/author";
import type {Route} from "./+types/author";
import {useEffect, useMemo} from "react";
import {Heading, Stack} from "@chakra-ui/react";
import {useGetAuthorQuery, useGetBooksByAuthorInfiniteQuery} from "@/entities/author";
import {useLibrarySearch, useShowAllUsers} from "@/features/library";
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
    const showAllUsers = useShowAllUsers();
    const userId = showAllUsers ? undefined : (sessionStorage.getItem("user_id") ?? undefined);

    const {data: authorData, isLoading: isAuthorLoading, error: authorError} = useGetAuthorQuery(authorName);
    const {data, hasNextPage, fetchNextPage, isLoading: isBooksLoading, error: booksError} = useGetBooksByAuthorInfiniteQuery({
        authorName,
        query,
        userId,
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

    if (!isBooksLoading && books.length === 0) {
        return <NoBooksMessage authorName={authorName}/>;
    }

    return (
        <Stack gap={4}>
            {isBooksLoading
                ? <AuthorPageSkeleton/>
                : <AuthorPage
                    authorName={authorName}
                    biography={authorData?.biography}
                    profilePictureUrl={authorData?.profilePictureUrl}
                    isAuthorLoading={isAuthorLoading}
                    books={books}
                    fetchMore={fetchNextPage}
                    hasMore={hasNextPage ?? false}
                    totalBooks={data?.pages[0]?.total}
                />
            }
        </Stack>
    );
}

function NoBooksMessage({authorName}: { authorName: string }) {
    const query = useLibrarySearch();
    return (
        <Stack height={"100%"} alignItems={"center"} justifyContent={"center"} gap={4}>
            {query
                ? <>
                    <Heading>No books match your search.</Heading>
                    <Heading size="md" color="fg.muted">Try a different title.</Heading>
                  </>
                : <Heading>No books found for {authorName}</Heading>
            }
        </Stack>
    );
}
