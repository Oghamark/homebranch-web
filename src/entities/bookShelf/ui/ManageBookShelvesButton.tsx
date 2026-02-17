import {Box, Checkbox, IconButton, Popover, Portal, Spinner, Stack, Text} from "@chakra-ui/react";
import {HiCollection} from "react-icons/hi";
import {
    useGetBookShelvesByBookQuery,
    useGetBookShelvesQuery,
    useAddBookToBookShelfMutation,
    useRemoveBookFromBookShelfMutation,
} from "@/entities/bookShelf";

export function ManageBookShelvesButton({bookId}: { bookId: string }) {
    const {data: allShelves, isLoading: shelvesLoading} = useGetBookShelvesQuery();
    const {data: bookShelves, isLoading: bookShelvesLoading} = useGetBookShelvesByBookQuery(bookId);
    const [addBook] = useAddBookToBookShelfMutation();
    const [removeBook] = useRemoveBookFromBookShelfMutation();

    const bookShelfIds = new Set(bookShelves?.map((s) => s.id) ?? []);

    const handleToggle = (shelfId: string, isOnShelf: boolean) => {
        if (isOnShelf) {
            removeBook({shelfId, bookId});
        } else {
            addBook({shelfId, bookId});
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
                    <Popover.Content>
                        <Popover.Header>
                            <Popover.Title>Bookshelves</Popover.Title>
                        </Popover.Header>
                        <Popover.Body>
                            {(shelvesLoading || bookShelvesLoading) ? (
                                <Spinner/>
                            ) : !allShelves || allShelves.length === 0 ? (
                                <Text color="GrayText">No shelves created yet</Text>
                            ) : (
                                <Stack gap={2}>
                                    {allShelves.map((shelf) => {
                                        const isOnShelf = bookShelfIds.has(shelf.id);
                                        return (
                                            <Box key={shelf.id}>
                                                <Checkbox.Root
                                                    checked={isOnShelf}
                                                    onCheckedChange={() => handleToggle(shelf.id, isOnShelf)}
                                                >
                                                    <Checkbox.HiddenInput/>
                                                    <Checkbox.Control/>
                                                    <Checkbox.Label>{shelf.title}</Checkbox.Label>
                                                </Checkbox.Root>
                                            </Box>
                                        );
                                    })}
                                </Stack>
                            )}
                        </Popover.Body>
                    </Popover.Content>
                </Popover.Positioner>
            </Portal>
        </Popover.Root>
    );
}
