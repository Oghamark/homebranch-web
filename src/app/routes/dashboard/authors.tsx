import {AuthorGridSkeletons, AuthorsPage} from "@/pages/authors";
import type {Route} from "./+types/authors";
import {useEffect, useMemo} from "react";
import {Flex, Heading, Stack} from "@chakra-ui/react";
import {useGetAuthorsInfiniteQuery} from "@/entities/author";
import {useLibrarySearch, useShowAllUsers, ShowAllUsersButton} from "@/features/library";
import {LuUser} from "react-icons/lu";
import {handleRtkError} from "@/shared/api/rtk-query";

export function meta({}: Route.MetaArgs) {
    return [
        {title: "Homebranch - Authors"},
        {name: "description", content: "Browse your library by author"},
    ];
}

export default function Authors() {
    const query = useLibrarySearch();
    const showAllUsers = useShowAllUsers();
    const userId = showAllUsers ? undefined : (sessionStorage.getItem("user_id") ?? undefined);
    const {data, hasNextPage, fetchNextPage, isLoading, error} = useGetAuthorsInfiniteQuery({query, userId});

    useEffect(() => {
        if (error) {
            handleRtkError(error);
        }
    }, [error]);

    const authors = useMemo(() => {
        return data?.pages.flatMap(page => page.data) ?? [];
    }, [data]);

    if (!isLoading && authors.length === 0) {
        return _noAuthors(showAllUsers);
    }

    return (
        <Stack gap={4}>
            <Flex align="center" gap={3} display={{base: "none", md: "flex"}} justify="space-between">
                <Flex align="center" gap={3}>
                    <LuUser size={24}/>
                    <Heading size="2xl">Authors</Heading>
                </Flex>
                <ShowAllUsersButton showLabel/>
            </Flex>
            {isLoading
                ? <AuthorGridSkeletons/>
                : <AuthorsPage authors={authors} fetchMore={fetchNextPage} hasMore={hasNextPage ?? false} totalAuthors={data?.pages[0]?.total}/>
            }
        </Stack>
    );
}

function _noAuthors(showAllUsers: boolean) {
    return (
        <Stack height={"100%"} alignItems={"center"} justifyContent={"center"} gap={4}>
            <Heading>{showAllUsers ? "No authors found!" : "No authors found in your library!"}</Heading>
            {!showAllUsers && <Heading>Add some books, or tap the user icon to browse everyone{"'"}s authors</Heading>}
        </Stack>
    );
}
