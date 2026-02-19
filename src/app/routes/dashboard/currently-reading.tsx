import type {Route} from "./+types/currently-reading";
import {Button, Flex, For, Grid, Heading, Stack} from "@chakra-ui/react";
import {Link} from "react-router";
import {useMemo} from "react";
import {BookCard, useGetBooksByIdsQuery} from "@/entities/book";
import {BookGridSkeletons} from "@/pages/library";
import {useLibrarySearch} from "@/features/library";
import {LuBookOpen} from "react-icons/lu";
import {StorageIndicator, useStorageLocations} from "@/features/reader";

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

    const {locations, allBookIds} = useStorageLocations(ids);

    const query = useLibrarySearch()
    const {data: books, isLoading} = useGetBooksByIdsQuery({bookIds: allBookIds, query: query}, {skip: allBookIds.length === 0});

    if (!isLoading && (!books || books.length === 0)) {
        return _noBooks();
    }

    return (
        <Stack gap={4}>
            <Flex align="center" gap={3} display={{base: "none", md: "flex"}}>
                <LuBookOpen size={24}/>
                <Heading size="2xl">Currently Reading</Heading>
            </Flex>
            {isLoading
                ? <BookGridSkeletons count={ids.length || 6}/>
                : <Grid gridTemplateColumns="repeat(auto-fill, minmax(160px, 1fr))" gap={6} p={1} pb={3}>
                    <For each={books!}>
                        {(book) => (
                            <BookCard
                                key={book.id}
                                book={book}
                                badge={locations[book.id] && (
                                    <StorageIndicator location={locations[book.id]}/>
                                )}
                            />
                        )}
                    </For>
                </Grid>
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
