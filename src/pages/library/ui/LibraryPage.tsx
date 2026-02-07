import {BookCard, type BookModel} from "@/entities/book";
import {Flex, For, Loader} from "@chakra-ui/react";
import InfiniteScroll from "react-infinite-scroll-component";

interface LibraryPageProps {
    books: BookModel[];
    hasMore: boolean;
    fetchMore: () => void;
}

export function LibraryPage({books, hasMore, fetchMore}: LibraryPageProps) {
    return (
        <InfiniteScroll
            next={fetchMore}
            hasMore={hasMore}
            loader={<Loader/>}
            dataLength={books.length}
        >
            <Flex wrap={"wrap"} gap={8} justify={{base: 'center', md: 'start'}}>
                <For each={books}>
                    {(book, _index) => (
                        <BookCard
                            book={book}
                        />
                    )}
                </For>
            </Flex>
        </InfiniteScroll>
    );
}
