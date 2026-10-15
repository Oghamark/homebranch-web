import {Box, Button, IconButton, Popover, Portal, Stack, Text} from "@chakra-ui/react";
import {LuLibrary} from "react-icons/lu";
import {Tooltip} from "@/shared/ui/tooltip";
import {
    useAddBookToBookShelfMutation,
    useGetBookShelvesByBookQuery,
    useGetBookShelvesQuery,
    useRemoveBookFromBookShelfMutation,
} from "@/entities/bookShelf";
import {useRef, useState} from "react";
import {ErrorState, LoadingState} from "@/shared/ui/EditorialUI";

export function ManageBookShelvesButton({bookId, size, variant = "subtle", showLabel = false}: { bookId: string, size?: "xs" | "sm" | "md" | "lg", variant?: "subtle" | "ghost" | "outline" | "solid" | "plain", showLabel?: boolean }) {
    const {data: allShelves, isLoading: shelvesLoading, isError: shelvesFailed, refetch: refetchShelves} = useGetBookShelvesQuery();
    const {data: bookShelves, isLoading: bookShelvesLoading, isError: membershipsFailed, refetch: refetchMemberships} = useGetBookShelvesByBookQuery(bookId);
    const [addBook] = useAddBookToBookShelfMutation();
    const [removeBook] = useRemoveBookFromBookShelfMutation();

    const bookShelfIds = new Set(bookShelves?.map((s) => s.id) ?? []);

    const [pending, setPending] = useState(false);
    const [failed, setFailed] = useState(false);
    const [saved, setSaved] = useState(false);
    const [pendingChoice, setPendingChoice] = useState<{shelfId: string; checked: boolean} | null>(null);
    const busy = useRef(false);
    const handleToggle = async (shelfId: string, isOnShelf: boolean) => {
        if (busy.current) return;
        busy.current = true;
        setPending(true);
        setPendingChoice({shelfId, checked: !isOnShelf});
        setFailed(false);
        setSaved(false);
        try {
            await (isOnShelf ? removeBook({shelfId, bookId}) : addBook({shelfId, bookId})).unwrap();
            await refetchMemberships();
            setSaved(true);
        } catch {
            setFailed(true);
        } finally {
            setPending(false);
            setPendingChoice(null);
            busy.current = false;
        }
    };

    return (
        <Popover.Root>
            <Tooltip content="Manage shelves">
                <Box display={"inline-block"} cursor={"pointer"}>
                    <Popover.Trigger asChild>
                        {showLabel
                            ? <Button variant={variant} size={size} minH="44px"><LuLibrary/> Shelves</Button>
                            : <IconButton variant={variant} size={size} aria-label="Manage shelves" minH="44px" minW="44px"><LuLibrary/></IconButton>}
                    </Popover.Trigger>
                </Box>
            </Tooltip>
            <Portal>
                <Popover.Positioner>
                    <Popover.Content>
                        <Popover.Header>
                            <Popover.Title>Bookshelves</Popover.Title>
                        </Popover.Header>
                        <Popover.Body>
                            <Text fontSize="sm" color="fg.muted" mb={3}>Choose shelves for this book. Removing it from a shelf does not delete it from your library.</Text>
                            {failed && <ErrorState>Shelf membership could not be saved. Please try again.</ErrorState>}
                            {saved && <Text role="status" fontSize="sm">Shelves updated.</Text>}
                            {(shelvesLoading || bookShelvesLoading) ? (
                                <LoadingState label="Loading shelves..."/>
                            ) : shelvesFailed || membershipsFailed ? (
                                <ErrorState onRetry={() => {void refetchShelves(); void refetchMemberships();}}>Shelves could not be loaded.</ErrorState>
                            ) : !allShelves || allShelves.length === 0 ? (
                                <Text color="fg.muted">No shelves created yet</Text>
                            ) : (
                                <Stack gap={2}>
                                    {allShelves.map((shelf) => {
                                        const isOnShelf = pendingChoice?.shelfId === shelf.id ? pendingChoice.checked : bookShelfIds.has(shelf.id);
                                        return (
                                            <Box key={shelf.id}>
                                                <Box as="label" display="flex" alignItems="center" gap={3} minH="44px" cursor={pending ? "wait" : "pointer"}>
                                                    <input type="checkbox" checked={isOnShelf} disabled={pending}
                                                        style={{width: 20, height: 20, accentColor: "var(--chakra-colors-orange-solid)"}}
                                                        onChange={() => void handleToggle(shelf.id, isOnShelf)}/>
                                                    <Text>{shelf.title}</Text>
                                                </Box>
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
