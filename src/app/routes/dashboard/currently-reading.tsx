import type {Route} from "./+types/currently-reading";
import {Button, Heading, Loader, Stack} from "@chakra-ui/react";
import {Link} from "react-router";
import {useMemo} from "react";
import {useGetBooksByIdsQuery} from "@/entities/book";
import {LibraryPage} from "@/pages/library";
import {useLibrarySearch} from "@/features/library";

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

    if (isLoading) {
        return <Loader/>;
    }

    if (!books || books.length === 0) {
        return _noBooks();
    }

    return (
        <LibraryPage
            books={books}
            fetchMore={() => {}}
            hasMore={false}
        />
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
