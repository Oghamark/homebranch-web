import type {ReactNode} from "react";
import {Box, Image, Skeleton, Stack, Text} from "@chakra-ui/react";
import type {BookModel} from "@/entities/book";
import {Link} from "react-router";
import {config} from "@/shared";

export function BookCard({book, badge}: { book: BookModel; badge?: ReactNode }) {
    return (
        <Stack
            transition="transform 0.2s"
            _hover={{transform: "scale(1.03)"}}
        >
            <Link to={`/books/${book.id}`}>
                <Box position="relative">
                    <Image
                        src={`${config.apiUrl}/uploads/cover-images/${
                            book.coverImageFileName
                        }`}
                        aspectRatio="2/3"
                        objectFit="cover"
                        borderRadius="md"
                        alt={book.title}
                    />
                    {badge}
                </Box>
            </Link>
            <Box>
                <Link to={`/books/${book.id}`}>
                    <Text lineClamp={2}>{book.title}</Text>
                </Link>
                <Text color="fg.muted" fontSize="sm" truncate>
                    {book.author}
                </Text>
            </Box>
        </Stack>
    );
}

export function BookCardSkeleton() {
    return (
        <Stack>
            <Skeleton aspectRatio="2/3" borderRadius="md"/>
            <Box>
                <Skeleton height="1em" width="80%"/>
                <Skeleton height="0.875em" width="60%" mt={1}/>
            </Box>
        </Stack>
    );
}
