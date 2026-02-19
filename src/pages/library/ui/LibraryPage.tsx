import {BookCard, BookCardSkeleton, type BookModel} from "@/entities/book";
import {For, Grid} from "@chakra-ui/react";
import InfiniteScroll from "react-infinite-scroll-component";

interface LibraryPageProps {
    books: BookModel[];
    hasMore: boolean;
    totalBooks?: number;
    fetchMore: () => void;
}

export function BookGridSkeletons({count = 12}: { count?: number } = {}) {
    return (
        <Grid gridTemplateColumns="repeat(auto-fill, minmax(160px, 1fr))" gap={6} p={1}>
            {Array.from({length: count}).map((_, i) => (
                <BookCardSkeleton key={i}/>
            ))}
        </Grid>
    );
}

export function LibraryPage({books, hasMore, totalBooks, fetchMore}: LibraryPageProps) {
    const remaining = totalBooks != null ? Math.max(totalBooks - books.length, 0) : 12;

    return (
        <InfiniteScroll
            next={fetchMore}
            hasMore={hasMore && books.length > 0}
            loader={<BookGridSkeletons count={remaining}/>}
            dataLength={books.length}
        >
            <Grid gridTemplateColumns="repeat(auto-fill, minmax(160px, 1fr))" gap={6} p={1} pb={3}>
                <For each={books}>
                    {(book, _index) => (
                        <BookCard
                            book={book}
                        />
                    )}
                </For>
            </Grid>
        </InfiniteScroll>
    );
}
