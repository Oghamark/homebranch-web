import {BookCard, BookCardSkeleton, type BookModel} from "@/entities/book";
import {Avatar, Box, For, Grid, Heading, Skeleton, Stack, Text} from "@chakra-ui/react";
import InfiniteScroll from "react-infinite-scroll-component";

interface AuthorPageProps {
    authorName: string;
    biography?: string | null;
    profilePictureUrl?: string | null;
    books: BookModel[];
    hasMore: boolean;
    totalBooks?: number;
    fetchMore: () => void;
}

function BookGridSkeletons({count = 12}: { count?: number } = {}) {
    return (
        <Grid gridTemplateColumns="repeat(auto-fill, minmax(160px, 1fr))" gap={6} p={1}>
            {Array.from({length: count}).map((_, index) => (
                <BookCardSkeleton key={index}/>
            ))}
        </Grid>
    );
}

export function AuthorPage({authorName, biography, profilePictureUrl, books, hasMore, totalBooks, fetchMore}: AuthorPageProps) {
    const remaining = totalBooks != null ? Math.max(totalBooks - books.length, 0) : 12;

    return (
        <Stack gap={6}>
            <Stack direction="row" gap={4} align="flex-start">
                <Avatar.Root size="2xl" flexShrink={0}>
                    <Avatar.Fallback name={authorName}/>
                    {profilePictureUrl && <Avatar.Image src={profilePictureUrl} alt={authorName}/>}
                </Avatar.Root>
                <Box>
                    <Heading size="2xl">{authorName}</Heading>
                    {biography && (
                        <Text mt={2} color="fg.muted" maxW="prose">
                            {biography}
                        </Text>
                    )}
                </Box>
            </Stack>
            <InfiniteScroll
                next={fetchMore}
                hasMore={hasMore && books.length > 0}
                loader={<BookGridSkeletons count={remaining}/>}
                dataLength={books.length}
            >
                <Grid gridTemplateColumns="repeat(auto-fill, minmax(160px, 1fr))" gap={6} p={1} pb={3}>
                    <For each={books}>
                        {(book, _index) => (
                            <BookCard book={book}/>
                        )}
                    </For>
                </Grid>
            </InfiniteScroll>
        </Stack>
    );
}

export function AuthorPageSkeleton() {
    return (
        <Stack gap={6}>
            <Stack direction="row" gap={4} align="flex-start">
                <Skeleton width="80px" height="80px" borderRadius="full" flexShrink={0}/>
                <Box>
                    <Skeleton height="2rem" width="200px"/>
                    <Skeleton height="1rem" width="400px" mt={2}/>
                    <Skeleton height="1rem" width="350px" mt={1}/>
                </Box>
            </Stack>
            <BookGridSkeletons/>
        </Stack>
    );
}
