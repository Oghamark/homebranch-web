import {BookCard, type BookModel, useGetBooksQuery} from "@/entities/book";
import {Flex, For, Loader} from "@chakra-ui/react";
import InfiniteScroll from "react-infinite-scroll-component";
import {type Dispatch, type SetStateAction, useState} from "react";
import type {Result} from "@/shared";
import type {PaginationResult} from "@/shared/api/api_response";

interface LibraryPageProps {
    result: PaginationResult<BookModel[]>;
    page: number;
    setPage: Dispatch<SetStateAction<number>>;
}

export function LibraryPage({result, page, setPage}: LibraryPageProps) {
    return (
        <InfiniteScroll
            next={() => setPage(prev => prev + 1)}
            hasMore={!!result && (result.data.length < result.total)}
            loader={<Loader/>}
            dataLength={result?.data.length ?? 0}
        >
            <Flex wrap={"wrap"} gap={8} justify={{base: 'center', md: 'start'}}>
                <For each={result?.data ?? []}>
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
