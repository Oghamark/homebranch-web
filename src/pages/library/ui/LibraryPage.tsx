import {BookCard, type BookModel, fetchBooks} from "@/entities/book";
import {Flex, For, Loader} from "@chakra-ui/react";
import InfiniteScroll from "react-infinite-scroll-component";
import {useRef, useState} from "react";

export function LibraryPage({books: initialBooks, total}: { books: BookModel[], total: number }) {
    const [page, setPage] = useState(0);
    const booksRef = useRef<BookModel[]>(initialBooks);

    const getNextPage = async () => {
        const {data} = await fetchBooks({limit: (50).toString(), offset: page.toString()});
        setPage(prev => prev + 1);
        booksRef.current = [...booksRef.current, ...data];
        return booksRef.current;
    }
    return (
        <InfiniteScroll
            next={getNextPage}
            hasMore={booksRef.current.length < total}
            loader={<Loader/>}
            dataLength={booksRef.current.length}
        >

        <Flex wrap={"wrap"} gap={8} justify={{base: 'center', md: 'start'}}>
            <For each={booksRef.current}>
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
