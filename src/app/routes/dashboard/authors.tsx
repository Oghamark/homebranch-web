import {AuthorGridSkeletons, AuthorsPage} from "@/pages/authors";
import type {Route} from "./+types/authors";
import {useEffect, useMemo, useState} from "react";
import {Flex, Heading, Stack, Switch, Text} from "@chakra-ui/react";
import {useGetAuthorsInfiniteQuery} from "@/entities/author";
import {useLibrarySearch} from "@/features/library";
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
    const [showAll, setShowAll] = useState(false);
    const userId = showAll ? undefined : (sessionStorage.getItem('user_id') ?? undefined);
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
        return _noAuthors(showAll, setShowAll);
    }

    return (
        <Stack gap={4}>
            <Flex align="center" gap={3} display={{base: "none", md: "flex"}}>
                <LuUser size={24}/>
                <Heading size="2xl">Authors</Heading>
                <Switch.Root
                    ml="auto"
                    checked={showAll}
                    onCheckedChange={(e) => setShowAll(e.checked)}
                >
                    <Switch.HiddenInput/>
                    <Switch.Control><Switch.Thumb/></Switch.Control>
                    <Switch.Label><Text fontSize="sm">Show all users</Text></Switch.Label>
                </Switch.Root>
            </Flex>
            {isLoading
                ? <AuthorGridSkeletons/>
                : <AuthorsPage authors={authors} fetchMore={fetchNextPage} hasMore={hasNextPage ?? false} totalAuthors={data?.pages[0]?.total}/>
            }
        </Stack>
    );
}

function _noAuthors(showAll: boolean, setShowAll: (v: boolean) => void) {
    return (
        <Stack height={"100%"} alignItems={"center"} justifyContent={"center"} gap={4}>
            <Heading>{showAll ? "No authors found!" : "No authors found in your library!"}</Heading>
            {!showAll &&
                <Flex align="center" gap={2}>
                    <Text>Show authors from all users?</Text>
                    <Switch.Root checked={showAll} onCheckedChange={(e) => setShowAll(e.checked)}>
                        <Switch.HiddenInput/>
                        <Switch.Control><Switch.Thumb/></Switch.Control>
                    </Switch.Root>
                </Flex>
            }
            {!showAll && <Heading>Add some books to see authors here</Heading>}
        </Stack>
    );
}
