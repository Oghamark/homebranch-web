import {Button, Heading, Stack} from "@chakra-ui/react";
import {Link} from "react-router";
import type {Route} from "./+types/favorites";
import {LibraryPage} from "@/pages/library";
import {useGetFavoriteBooksQuery} from "@/entities/book";
import {useState} from "react";

export function meta({}: Route.MetaArgs) {
    return [
        {title: "Homebranch - Favorites"},
        {name: "description", content: "Welcome to React Router!"},
    ];
}

export default function Favorites() {
    const [page, setPage] = useState(0);
    const {result, isLoading, error} = useGetFavoriteBooksQuery(page);
    return (!result || result?.total === 0) ? _noBooks() : <LibraryPage result={result} page={page} setPage={setPage} />;
}

function _noBooks() {
    return (
        <Stack
            height={"100%"}
            alignItems={"center"}
            justifyContent={"center"}
            gap={4}
        >
            <Heading>You don't have any favorited books!</Heading>
            <Link to={"/"}>
                <Button>Go to Library</Button>
            </Link>
        </Stack>
    );
}
