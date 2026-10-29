import {BookCard, BookCardSkeleton, type BookModel} from "@/entities/book";
import {Avatar, Box, Button, For, Grid, HStack, Link as ChakraLink, Stack, Table, Text} from "@chakra-ui/react";
import InfiniteScroll from "react-infinite-scroll-component";
import type {LibraryDisplayMode} from "@/features/library/store/librarySlice";
import {Link} from "react-router";
import {config} from "@/shared";
import type {ReactNode} from "react";
import {ErrorState, LoadingState} from "@/shared/ui/EditorialUI";

interface LibraryPageProps {
    books: BookModel[];
    hasMore: boolean;
    totalBooks?: number;
    fetchMore: () => void;
    displayMode?: LibraryDisplayMode;
    getBookBadge?: (book: BookModel) => ReactNode;
    loadingMore?: boolean;
    loadMoreError?: boolean;
}

interface BookGridSkeletonsProps {
    count?: number;
    displayMode?: LibraryDisplayMode;
}

const responsiveGridTemplateColumns = {
    base: "repeat(2, minmax(0, 1fr))",
    sm: "repeat(auto-fill, minmax(160px, 1fr))"
};

export function BookGridSkeletons({count = 12, displayMode = "grid"}: BookGridSkeletonsProps = {}) {
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
        <Grid gridTemplateColumns={responsiveGridTemplateColumns} gap={6} p={1} role="status" aria-label="Loading books">
            {Array.from({length: count}).map((_, i) => (
                <BookCardSkeleton key={i}/>
            ))}
        </Grid>
    );
}

export function LibraryPage({books, hasMore, totalBooks, fetchMore, displayMode = "grid", getBookBadge, loadingMore = false, loadMoreError = false}: LibraryPageProps) {
    return <Stack gap={4} minW={0}>
        <Text fontSize="sm" color="fg.muted" role="status">{books.length}{totalBooks != null ? ` of ${totalBooks}` : ""} {totalBooks === 1 || (totalBooks == null && books.length === 1) ? "book" : "books"}</Text>
        <InfiniteScroll
            next={fetchMore}
            hasMore={hasMore && !loadMoreError && books.length > 0}
            loader={null}
            dataLength={books.length}
            style={{overflow: "visible"}}
        >
            {displayMode === "table" ? (
                <Box overflowX="auto" borderWidth="1px" borderRadius="lg">
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
                                                <Link to={`/books/${book.id}`} style={{display: "inline-flex", alignItems: "center", minHeight: "44px"}}>{book.title}</Link>
                                            </ChakraLink>
                                            {getBookBadge && <Box position="relative" minW="44px" minH="36px">{getBookBadge(book)}</Box>}
                                        </HStack>
                                    </Table.Cell>
                                    <Table.Cell>{book.author}</Table.Cell>
                                    <Table.Cell>{book.publishedYear ?? "Not listed"}</Table.Cell>
                                </Table.Row>
                            )}
                        </For>
                    </Table.Body>
                </Table.Root>
                </Box>
            ) : (
                <Grid
                    gridTemplateColumns={responsiveGridTemplateColumns}
                    gap={6}
                    p={1}
                    pb={3}
                >
                    <For each={books}>
                        {(book) => (
                            <BookCard
                                key={book.id}
                                book={book}
                                badge={getBookBadge?.(book)}
                            />
                        )}
                    </For>
                </Grid>
            )}
        </InfiniteScroll>
        {loadingMore && <LoadingState label="Loading more books..."/>}
        {loadMoreError && <ErrorState onRetry={fetchMore}>More books could not be loaded. Your current results are still here.</ErrorState>}
        {hasMore && !loadingMore && !loadMoreError && <Button alignSelf="center" minH="44px" variant="outline" onClick={fetchMore}>Load more books</Button>}
    </Stack>;
}
