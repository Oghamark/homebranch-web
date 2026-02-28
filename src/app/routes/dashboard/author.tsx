import {AuthorPage, AuthorPageSkeleton} from "@/pages/author";
import type {Route} from "./+types/author";
import {useEffect, useMemo, useState} from "react";
import {Flex, Heading, Stack, Switch, Text} from "@chakra-ui/react";
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
    const [showAll, setShowAll] = useState(false);
    const userId = showAll ? undefined : (sessionStorage.getItem('user_id') ?? undefined);

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

    const isLoading = isBooksLoading;

    if (!isLoading && books.length === 0) {
        return _noBooks(authorName, showAll, setShowAll);
    }

    return (
        <Stack gap={4}>
            <Flex align="center" gap={3} display={{base: "none", md: "flex"}} justify="flex-end">
                <Switch.Root checked={showAll} onCheckedChange={(e) => setShowAll(e.checked)}>
                    <Switch.HiddenInput/>
                    <Switch.Control><Switch.Thumb/></Switch.Control>
                    <Switch.Label><Text fontSize="sm">Show all users</Text></Switch.Label>
                </Switch.Root>
            </Flex>
            {isLoading
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

function _noBooks(authorName: string, showAll: boolean, setShowAll: (v: boolean) => void) {
    return (
        <Stack height={"100%"} alignItems={"center"} justifyContent={"center"} gap={4}>
            <Heading>No books found for {authorName}</Heading>
            {!showAll &&
                <Flex align="center" gap={2}>
                    <Text>Show books from all users?</Text>
                    <Switch.Root checked={showAll} onCheckedChange={(e) => setShowAll(e.checked)}>
                        <Switch.HiddenInput/>
                        <Switch.Control><Switch.Thumb/></Switch.Control>
                    </Switch.Root>
                </Flex>
            }
        </Stack>
    );
}
