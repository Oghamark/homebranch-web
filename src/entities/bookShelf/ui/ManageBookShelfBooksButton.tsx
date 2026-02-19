import {useMemo, useState} from "react";
import {useDebounce} from "@uidotdev/usehooks";
import {
    type BookShelfModel,
    useAddBookToBookShelfMutation,
    useRemoveBookFromBookShelfMutation
} from "@/entities/bookShelf";
import {useGetBooksInfiniteQuery} from "@/entities/book";
import {Box, HStack, IconButton, Image, Loader, Popover, Portal, Spinner, Stack, Text} from "@chakra-ui/react";
import {HiCollection, HiPlus} from "react-icons/hi";
import TextField from "@/components/ui/TextField";
import InfiniteScroll from "react-infinite-scroll-component";
import {config} from "@/shared";
import {HiMinus} from "react-icons/hi2";

interface ManageBookShelfBooksButtonProps {
    bookShelf: BookShelfModel;
}

export function ManageBookShelfBooksButton({bookShelf}: ManageBookShelfBooksButtonProps) {
    const [query, setQuery] = useState<string>();
    const debouncedQuery = useDebounce(query ?? '', 500)
    const [addBook] = useAddBookToBookShelfMutation();
    const [removeBook] = useRemoveBookFromBookShelfMutation();
    const {
        data: allBooksPaginated,
        isLoading: isLoadingAllBooks,
        hasNextPage: allBooksHasNextPage,
        fetchNextPage: fetchMoreBooks
    } = useGetBooksInfiniteQuery({query: debouncedQuery});

    const allBooks = useMemo(() => {
        return allBooksPaginated?.pages.flatMap(page => page.data) ?? []
    }, [allBooksPaginated]);

    const bookShelfBookIds = new Set(bookShelf?.books.map(book => book.id));

    const handleToggle = (bookId: string, isOnShelf: boolean) => {
        if (isOnShelf) {
            removeBook({shelfId: bookShelf.id, bookId});
        } else {
            addBook({shelfId: bookShelf.id, bookId});
        }
    };

    return (
        <Popover.Root>
            <Popover.Trigger asChild>
                <IconButton variant="subtle">
                    <HiCollection/>
                </IconButton>
            </Popover.Trigger>
            <Portal>
                <Popover.Positioner>
                    <Popover.Content overflow="hidden">
                        <Popover.Header>
                            <Popover.Title>Books</Popover.Title>
                        </Popover.Header>
                        <Popover.Body>
                            {(isLoadingAllBooks) ? (
                                <Spinner/>
                            ) : !allBooks || allBooks.length === 0 ? (
                                <Text color="GrayText">No books in your library</Text>
                            ) : (
                                <Stack>
                                    <TextField placeholder={"Search"} onChange={event => setQuery(event.target.value)}/>
                                    <Box id={"scroll-container"} maxH={"min(400px, 50vh)"} overflowY={"auto"}>
                                        <InfiniteScroll
                                            next={fetchMoreBooks}
                                            hasMore={allBooksHasNextPage}
                                            loader={<Loader/>}
                                            dataLength={allBooks.length}
                                            scrollableTarget={"scroll-container"}
                                        >
                                            {allBooks.map((book) => {
                                                const isOnShelf = bookShelfBookIds.has(book.id);
                                                return (
                                                    <HStack key={book.id} gap={3} p={2}
                                                            borderRadius="md">
                                                        <Image
                                                            src={`${config.apiUrl}/uploads/cover-images/${book.coverImageFileName}`}
                                                            alt={book.title}
                                                            h="50px"
                                                            w="35px"
                                                            objectFit="cover"
                                                            borderRadius="sm"
                                                        />
                                                        <Box flex={1}>
                                                            <Text fontSize="sm" fontWeight="medium">{book.title}</Text>
                                                            <Text fontSize="xs" color="GrayText">{book.author}</Text>
                                                        </Box>
                                                        <IconButton
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => handleToggle(book.id, isOnShelf)}
                                                        >
                                                            {isOnShelf ? <HiMinus/> : <HiPlus/>}
                                                        </IconButton>
                                                    </HStack>
                                                );
                                            })}
                                        </InfiniteScroll>

                                    </Box>
                                </Stack>
                            )}
                        </Popover.Body>
                    </Popover.Content>
                </Popover.Positioner>
            </Portal>
        </Popover.Root>
    );
}
