import {BookCard, BookCardSkeleton, type BookModel} from "@/entities/book";
import {Avatar, For, Grid, HStack, Link as ChakraLink, Table, Text} from "@chakra-ui/react";
import InfiniteScroll from "react-infinite-scroll-component";
import type {LibraryDisplayMode} from "@/features/library/store/librarySlice";
import {Link} from "react-router";
import {config} from "@/shared";

interface LibraryPageProps {
    books: BookModel[];
    hasMore: boolean;
    totalBooks?: number;
    fetchMore: () => void;
    displayMode: LibraryDisplayMode;
    booksPerRow: number;
}

interface BookGridSkeletonsProps {
    count?: number;
    displayMode?: LibraryDisplayMode;
    booksPerRow?: number;
}

export function BookGridSkeletons({count = 12, displayMode = "grid", booksPerRow = 4}: BookGridSkeletonsProps = {}) {
    if (displayMode === "table") {
        return (
            <Table.Root variant="outline" size="sm">
                <Table.Header>
                    <Table.Row>
                        <Table.ColumnHeader>Title</Table.ColumnHeader>
                        <Table.ColumnHeader>Author</Table.ColumnHeader>
                        <Table.ColumnHeader>Published</Table.ColumnHeader>
                    </Table.Row>
                </Table.Header>
                <Table.Body>
                    {Array.from({length: count}).map((_, i) => (
                        <Table.Row key={i}>
                            <Table.Cell>
                                <HStack gap={3}>
                                    <Avatar.Root size="sm">
                                        <Avatar.Fallback/>
                                    </Avatar.Root>
                                    <Text color="fg.muted">Loading...</Text>
                                </HStack>
                            </Table.Cell>
                            <Table.Cell><Text color="fg.muted">Loading...</Text></Table.Cell>
                            <Table.Cell><Text color="fg.muted">Loading...</Text></Table.Cell>
                        </Table.Row>
                    ))}
                </Table.Body>
            </Table.Root>
        );
    }

    return (
        <Grid gridTemplateColumns={{base: "repeat(2, minmax(0, 1fr))", md: `repeat(${booksPerRow}, minmax(0, 1fr))`}} gap={6} p={1}>
            {Array.from({length: count}).map((_, i) => (
                <BookCardSkeleton key={i}/>
            ))}
        </Grid>
    );
}

export function LibraryPage({books, hasMore, totalBooks, fetchMore, displayMode, booksPerRow}: LibraryPageProps) {
    const remaining = totalBooks != null ? Math.max(totalBooks - books.length, 0) : 12;

    return (
        <InfiniteScroll
            next={fetchMore}
            hasMore={hasMore && books.length > 0}
            loader={<BookGridSkeletons count={remaining} displayMode={displayMode} booksPerRow={booksPerRow}/>}
            dataLength={books.length}
        >
            {displayMode === "table" ? (
                <Table.Root variant="outline" size="sm">
                    <Table.Header>
                        <Table.Row>
                            <Table.ColumnHeader>Title</Table.ColumnHeader>
                            <Table.ColumnHeader>Author</Table.ColumnHeader>
                            <Table.ColumnHeader>Published</Table.ColumnHeader>
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        <For each={books}>
                            {(book) => (
                                <Table.Row key={book.id}>
                                    <Table.Cell>
                                        <HStack gap={3}>
                                            <Avatar.Root size="sm">
                                                <Avatar.Image src={book.coverImageFileName ? `${config.apiUrl}/uploads/cover-images/${book.coverImageFileName}` : undefined}/>
                                                <Avatar.Fallback name={book.title}/>
                                            </Avatar.Root>
                                            <ChakraLink asChild>
                                                <Link to={`/books/${book.id}`}>{book.title}</Link>
                                            </ChakraLink>
                                        </HStack>
                                    </Table.Cell>
                                    <Table.Cell>{book.author}</Table.Cell>
                                    <Table.Cell>{book.publishedYear ?? "—"}</Table.Cell>
                                </Table.Row>
                            )}
                        </For>
                    </Table.Body>
                </Table.Root>
            ) : (
                <Grid
                    gridTemplateColumns={{base: "repeat(2, minmax(0, 1fr))", md: `repeat(${booksPerRow}, minmax(0, 1fr))`}}
                    gap={6}
                    p={1}
                    pb={3}
                >
                    <For each={books}>
                        {(book) => (
                            <BookCard book={book}/>
                        )}
                    </For>
                </Grid>
            )}
        </InfiniteScroll>
    );
}
