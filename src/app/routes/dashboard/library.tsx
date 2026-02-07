import {LibraryPage} from "@/pages/library";
import type {Route} from "./+types/library";
import {useState} from "react";
import {useGetBooksQuery} from "@/entities/book";
import {Heading, Stack} from "@chakra-ui/react";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Homebranch - Library" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function Library() {
    const [page, setPage] = useState(0);
    const {result, isLoading, error} = useGetBooksQuery(page);
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
            <Heading>You don't have any books in your library!</Heading>
            <Heading>Add some books to see them here</Heading>
        </Stack>
    )
}
