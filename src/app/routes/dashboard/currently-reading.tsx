import type {Route} from "./+types/currently-reading";
import {Button, Flex, Heading, Stack} from "@chakra-ui/react";
import {Link} from "react-router";
import {useMemo} from "react";
import {useGetBooksByIdsQuery} from "@/entities/book";
import {BookGridSkeletons, LibraryPage} from "@/pages/library";
import {useLibrarySearch} from "@/features/library";
import {LuBookOpen} from "react-icons/lu";

export function meta({}: Route.MetaArgs) {
    return [
        {title: "Homebranch - Currently Reading"},
        {name: "description", content: "Currently reading books"},
    ];
}

export default function CurrentlyReading() {
    const ids = useMemo(() => {
        const currentlyReading = JSON.parse(
            localStorage.getItem("currentlyReading") ?? "{}"
        );
        return Object.keys(currentlyReading ?? {});
    }, []);

    const query = useLibrarySearch()
    const {data: books, isLoading} = useGetBooksByIdsQuery({bookIds: ids, query: query}, {skip: ids.length === 0});

    if (!isLoading && (!books || books.length === 0)) {
        return _noBooks();
    }

    return (
        <Stack gap={4}>
            <Flex align="center" gap={3}>
                <LuBookOpen size={24}/>
                <Heading size="2xl">Currently Reading</Heading>
            </Flex>
            {isLoading
                ? <BookGridSkeletons count={ids.length || 6}/>
                : <LibraryPage
                    books={books!}
                    fetchMore={() => {}}
                    hasMore={false}
                />
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
            <Heading>You don't have any open books!</Heading>
            <Heading size={"md"}>Start reading something new!</Heading>
            <Link to={"/"}>
                <Button>Go to Library</Button>
            </Link>
        </Stack>
    );
}
