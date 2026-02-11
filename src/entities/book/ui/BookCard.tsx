import {Box, Image, Stack, Text} from "@chakra-ui/react";
import type {BookModel} from "@/entities/book";
import {Link} from "react-router";
import {config} from "@/shared";

export function BookCard({book}: { book: BookModel }) {
    return (
        <Stack w={"220px"}>
            <Link to={`/books/${book.id}`}>
                <Image
                    src={`${config.apiUrl}/uploads/cover-images/${
                        book.coverImageFileName
                    }`}
                    h={"250px"}
                />
            </Link>
            <Box>
                <Link to={`/books/${book.id}`}>
                    <Text>{book.title}</Text>
                </Link>
                <Text color={"GrayText"} fontSize={"sm"}>
                    {book.author}
                </Text>
            </Box>
        </Stack>
    );
}
