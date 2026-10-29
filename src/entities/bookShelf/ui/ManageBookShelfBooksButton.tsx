import {useId, useMemo, useRef, useState} from "react";
import {useDebounce} from "@uidotdev/usehooks";
import {
    type BookShelfModel,
    useAddBookToBookShelfMutation,
    useRemoveBookFromBookShelfMutation
} from "@/entities/bookShelf";
import {useGetBooksInfiniteQuery} from "@/entities/book";
import {Box, Button, CloseButton, Dialog, HStack, IconButton, Image, Portal, Stack, Text} from "@chakra-ui/react";
import {HiCollection, HiPlus} from "react-icons/hi";
import TextField from "@/shared/ui/TextField";
import InfiniteScroll from "react-infinite-scroll-component";
import {config} from "@/shared";
import {HiMinus} from "react-icons/hi2";
import {BookJacket, EmptyState, ErrorState, LoadingState} from "@/shared/ui/EditorialUI";

interface ManageBookShelfBooksButtonProps {
    bookShelf: BookShelfModel;
}

export function ManageBookShelfBooksButton({bookShelf}: ManageBookShelfBooksButtonProps) {
    const [query, setQuery] = useState<string>();
    const [open, setOpen] = useState(false);
    const [pendingId, setPendingId] = useState<string | null>(null);
    const [failed, setFailed] = useState(false);
    const [saved, setSaved] = useState(false);
    const busy = useRef(false);
    const scrollId = useId();
    const debouncedQuery = useDebounce(query ?? '', 500)
    const [addBook] = useAddBookToBookShelfMutation();
    const [removeBook] = useRemoveBookFromBookShelfMutation();
    const {
        data: allBooksPaginated,
        isLoading: isLoadingAllBooks,
        isError,
        refetch,
        hasNextPage: allBooksHasNextPage,
        fetchNextPage: fetchMoreBooks
    } = useGetBooksInfiniteQuery({query: debouncedQuery});

    const allBooks = useMemo(() => {
        return allBooksPaginated?.pages.flatMap(page => page.data) ?? []
    }, [allBooksPaginated]);
    const isFetchNextPageError = isError && allBooks.length > 0;

    const bookShelfBookIds = new Set(bookShelf?.books.map(book => book.id));

    const handleToggle = async (bookId: string, isOnShelf: boolean) => {
        if (busy.current) return;
        busy.current = true;
        setPendingId(bookId);
        setFailed(false);
        setSaved(false);
        try {
            await (isOnShelf ? removeBook({shelfId: bookShelf.id, bookId}) : addBook({shelfId: bookShelf.id, bookId})).unwrap();
            setSaved(true);
        } catch {
            setFailed(true);
        } finally {
            setPendingId(null);
            busy.current = false;
        }
    };

    return (
        <Dialog.Root open={open} onOpenChange={({open}) => {if (!busy.current) setOpen(open);}}
            closeOnEscape={!pendingId} closeOnInteractOutside={!pendingId}>
            <Dialog.Trigger asChild>
                <Button variant="outline" minH="44px"><HiCollection/> Add or remove books</Button>
            </Dialog.Trigger>
            <Portal>
                <Dialog.Backdrop/>
                <Dialog.Positioner p={4}>
                    <Dialog.Content overflow="hidden">
                        <Dialog.Header>
                            <Dialog.Title>Books on {bookShelf.title}</Dialog.Title>
                        </Dialog.Header>
                        <Dialog.Body>
                            <Stack>
                                <Dialog.Description>Adding or removing books here only changes this shelf. Your library files are not deleted.</Dialog.Description>
                                <TextField label="Search library" placeholder="Title, author, or keyword" value={query ?? ""} onChange={event => setQuery(event.target.value)}/>
                                {failed && <ErrorState>The shelf could not be updated. Please try again.</ErrorState>}
                                {saved && <Text role="status" fontSize="sm">Shelf updated.</Text>}
                                {(isLoadingAllBooks) ? (
                                    <LoadingState label="Loading books..."/>
                                ) : isError && !allBooks.length ? (
                                    <ErrorState onRetry={refetch}>Your books could not be loaded.</ErrorState>
                                ) : !allBooks || allBooks.length === 0 ? (
                                    <EmptyState title={debouncedQuery ? "No matching books" : "No books in your library"}>Upload books to your library before adding them to this shelf.</EmptyState>
                                ) : (
                                    <Box id={scrollId} maxH={"min(400px, 50vh)"} overflowY={"auto"}>
                                        <InfiniteScroll
                                            next={fetchMoreBooks}
                                            hasMore={allBooksHasNextPage && !isFetchNextPageError}
                                            loader={<LoadingState label="Loading more books..."/>}
                                            dataLength={allBooks.length}
                                            scrollableTarget={scrollId}
                                        >
                                            {allBooks.map((book) => {
                                                const isOnShelf = bookShelfBookIds.has(book.id);
                                                return (
                                                    <HStack key={book.id} gap={3} p={2}
                                                            borderRadius="md">
                                                        {book.coverImageFileName ? <Image
                                                            src={`${config.apiUrl}/uploads/cover-images/${book.coverImageFileName}`}
                                                            alt={book.title}
                                                            h="50px"
                                                            w="35px"
                                                            objectFit="cover"
                                                            borderRadius="sm"
                                                        /> : <BookJacket title={book.title} author={book.author} compact/>}
                                                        <Box flex={1} minW={0}>
                                                            <Text fontSize="sm" fontWeight="medium">{book.title}</Text>
                                                            <Text fontSize="xs" color="fg.muted">{book.author}</Text>
                                                        </Box>
                                                        <IconButton
                                                            size="sm"
                                                            variant="ghost"
                                                            minH="44px"
                                                            minW="44px"
                                                            aria-label={`${isOnShelf ? "Remove" : "Add"} ${book.title} ${isOnShelf ? "from" : "to"} ${bookShelf.title}`}
                                                            loading={pendingId === book.id}
                                                            disabled={Boolean(pendingId)}
                                                            onClick={() => handleToggle(book.id, isOnShelf)}
                                                        >
                                                            {isOnShelf ? <HiMinus/> : <HiPlus/>}
                                                        </IconButton>
                                                    </HStack>
                                                );
                                            })}
                                        </InfiniteScroll>
                                        {isFetchNextPageError && <ErrorState onRetry={fetchMoreBooks}>More books could not be loaded. Your current results are kept.</ErrorState>}

                                    </Box>
                                )}
                            </Stack>
                        </Dialog.Body>
                        <Dialog.Footer><Dialog.ActionTrigger asChild><Button variant="outline" minH="44px" disabled={Boolean(pendingId)}>Done</Button></Dialog.ActionTrigger></Dialog.Footer>
                        <Dialog.CloseTrigger asChild><CloseButton aria-label="Close shelf books" minH="44px" minW="44px" disabled={Boolean(pendingId)}/></Dialog.CloseTrigger>
                    </Dialog.Content>
                </Dialog.Positioner>
            </Portal>
        </Dialog.Root>
    );
}
