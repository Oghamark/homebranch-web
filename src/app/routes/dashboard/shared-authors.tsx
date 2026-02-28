import {AuthorGridSkeletons, AuthorsPage} from "@/pages/authors";
import type {Route} from "./+types/shared-authors";
import {useEffect, useMemo} from "react";
import {Flex, Heading, Stack} from "@chakra-ui/react";
import {useGetAuthorsInfiniteQuery} from "@/entities/author";
import {useLibrarySearch} from "@/features/library";
import {LuUsers} from "react-icons/lu";
import {handleRtkError} from "@/shared/api/rtk-query";

export function meta({}: Route.MetaArgs) {
    return [
        {title: "Homebranch - Shared Authors"},
        {name: "description", content: "Browse authors from all users' books"},
    ];
}

export default function SharedAuthors() {
    const query = useLibrarySearch();
    const {data, hasNextPage, fetchNextPage, isLoading, error} = useGetAuthorsInfiniteQuery({query});

    useEffect(() => {
        if (error) {
            handleRtkError(error);
        }
    }, [error]);

    const authors = useMemo(() => {
        return data?.pages.flatMap(page => page.data) ?? [];
    }, [data]);

    if (!isLoading && authors.length === 0) {
        return (
            <Stack height={"100%"} alignItems={"center"} justifyContent={"center"} gap={4}>
                <Heading>No authors found in the shared library!</Heading>
            </Stack>
        );
    }

    return (
        <Stack gap={4}>
            <Flex align="center" gap={3} display={{base: "none", md: "flex"}}>
                <LuUsers size={24}/>
                <Heading size="2xl">Shared Authors</Heading>
            </Flex>
            {isLoading
                ? <AuthorGridSkeletons/>
                : <AuthorsPage authors={authors} fetchMore={fetchNextPage} hasMore={hasNextPage ?? false} totalAuthors={data?.pages[0]?.total}/>
            }
        </Stack>
    );
}
