import {Box, Skeleton, Stack, Text} from "@chakra-ui/react";
import type {AuthorModel} from "@/entities/author";
import {Link} from "react-router";

export function AuthorCard({author}: { author: AuthorModel }) {
    return (
        <Stack
            transition="transform 0.2s"
            _hover={{transform: "scale(1.03)"}}
        >
            <Link to={`/authors/${encodeURIComponent(author.name)}`}>
                <Box>
                    <Text fontWeight="semibold" lineClamp={2}>{author.name}</Text>
                    <Text color="fg.muted" fontSize="sm">
                        {author.bookCount} {author.bookCount === 1 ? "book" : "books"}
                    </Text>
                </Box>
            </Link>
        </Stack>
    );
}

export function AuthorCardSkeleton() {
    return (
        <Stack>
            <Skeleton height="1.25em" width="70%"/>
            <Skeleton height="0.875em" width="40%" mt={1}/>
        </Stack>
    );
}
