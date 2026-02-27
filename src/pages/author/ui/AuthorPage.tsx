import {BookCard, BookCardSkeleton, type BookModel} from "@/entities/book";
import {For, Grid, Heading, Stack} from "@chakra-ui/react";
import InfiniteScroll from "react-infinite-scroll-component";

interface AuthorPageProps {
    authorName: string;
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

export function AuthorPage({authorName, books, hasMore, totalBooks, fetchMore}: AuthorPageProps) {
    const remaining = totalBooks != null ? Math.max(totalBooks - books.length, 0) : 12;

    return (
        <Stack gap={4}>
            <Heading size="2xl">{authorName}</Heading>
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
