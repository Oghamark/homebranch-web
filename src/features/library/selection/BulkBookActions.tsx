import {useRef, useState} from "react";
import {Button, Flex, IconButton, Menu, NativeSelect, Popover, Portal, Stack, Text} from "@chakra-ui/react";
import {LuChevronDown, LuHeart, LuHeartOff, LuLibrary, LuMinus, LuTrash2, LuUserRound, LuX} from "react-icons/lu";
import {useBulkBooksMutation, type BulkBookAction, type BulkBooksRequest} from "@/entities/book/api/api";
import {useGetBookShelvesQuery} from "@/entities/bookShelf";
import {useGetUsersQuery} from "@/entities/user";
import {ConfirmAction, ErrorState} from "@/shared/ui/EditorialUI";
import ToastFactory from "@/shared/lib/toast/toast";
import {isFetchBaseQueryError} from "@/shared/api/rtk-query";
import {useBookSelection, type BookSelection} from "./BookSelectionContext";

const actionLabels: Record<BulkBookAction, string> = {
    delete: "Deleted",
    favorite: "Added to favorites",
    unfavorite: "Removed from favorites",
    "add-to-shelf": "Added to bookshelf",
    "remove-from-shelf": "Removed from bookshelf",
    "assign-owner": "Assigned ownership",
};

const actionChoices = [
    {action: "favorite", label: "Add to favorites", icon: LuHeart},
    {action: "unfavorite", label: "Remove from favorites", icon: LuHeartOff},
    {action: "add-to-shelf", label: "Add to bookshelf", icon: LuLibrary},
    {action: "remove-from-shelf", label: "Remove from bookshelf", icon: LuMinus},
    {action: "assign-owner", label: "Assign ownership", icon: LuUserRound},
    {action: "delete", label: "Delete selected books", icon: LuTrash2},
] satisfies Array<{action: BulkBookAction; label: string; icon: typeof LuHeart}>;

export function BulkBookActions() {
    const selection = useBookSelection();
    return selection ? <BulkBookActionsContent selection={selection}/> : null;
}

function BulkBookActionsContent({selection}: {selection: BookSelection}) {
    const isAdmin = sessionStorage.getItem("user_role") === "ADMIN";
    const userId = sessionStorage.getItem("user_id");
    const [action, setAction] = useState<BulkBookAction | "">("");
    const isShelfAction = action === "add-to-shelf" || action === "remove-from-shelf";
    const shelves = useGetBookShelvesQuery(undefined, {skip: selection.selected.size === 0 || !isShelfAction});
    const users = useGetUsersQuery(undefined, {skip: !isAdmin || selection.selected.size === 0 || action !== "assign-owner"});
    const [bulkBooks] = useBulkBooksMutation();
    const [shelfId, setShelfId] = useState("");
    const [ownerId, setOwnerId] = useState("");
    const [feedback, setFeedback] = useState("");
    const [failures, setFailures] = useState<Array<{title: string; message: string}>>([]);
    const pending = useRef(false);
    const books = [...selection.selected.values()];
    const count = books.length;
    const canDelete = isAdmin || books.every(book => book.uploadedByUserId === userId);
    const shelf = shelves.data?.find(item => item.id === shelfId);
    const owner = users.data?.find(item => item.id === ownerId);
    const ownerValid = ownerId === "unowned" || Boolean(owner);
    const disabled = selection.busy || count === 0;

    async function run(action: BulkBookAction) {
        if (pending.current) return false;
        if (count === 0 || (action === "delete" && !canDelete)) {
            setFeedback("Select books you have permission to change.");
            return false;
        }
        if ((action === "add-to-shelf" || action === "remove-from-shelf") && (!shelf || shelves.isError)) {
            setFeedback("Choose an available bookshelf before continuing.");
            return false;
        }
        if (action === "assign-owner" && (!isAdmin || !ownerValid || users.isError)) {
            setFeedback("Administrator access and an available owner are required.");
            return false;
        }
        pending.current = true;
        selection.setBusy(true);
        setFeedback("");
        setFailures([]);
        const snapshot = [...books];
        const failed: Array<{title: string; message: string}> = [];
        let succeeded = 0;
        try {
            for (let offset = 0; offset < snapshot.length; offset += 100) {
                if (sessionStorage.getItem("user_id") !== userId) {
                    ToastFactory({message: "Bulk action stopped because your account changed. Review your library before retrying.", type: "error"});
                    return false;
                }
                const bookIds = snapshot.slice(offset, offset + 100).map(book => book.id);
                let request: BulkBooksRequest;
                if (action === "add-to-shelf" || action === "remove-from-shelf") {
                    request = {action, bookIds, shelfId};
                } else if (action === "assign-owner") {
                    request = {action, bookIds, ownerId: ownerId === "unowned" ? null : ownerId};
                } else {
                    request = {action, bookIds};
                }
                const result = await bulkBooks(request).unwrap();
                succeeded += result.succeeded.length;
                selection.remove(result.succeeded);
                for (const failure of result.failed) {
                    failed.push({title: snapshot.find(book => book.id === failure.bookId)?.title ?? failure.bookId, message: failure.message});
                }
            }
            if (failed.length) {
                setFailures(failed);
                setFeedback(`${succeeded} of ${snapshot.length} books updated; ${failed.length} failed. Failed books remain selected.`);
                return false;
            }
            ToastFactory({message: `${actionLabels[action]}: ${succeeded} book${succeeded === 1 ? "" : "s"}`, type: "success"});
            return true;
        } catch (error: unknown) {
            setFailures(failed);
            setFeedback(isFetchBaseQueryError(error) && typeof error.status === "number" && error.status >= 400 && error.status < 500
                ? `${succeeded} of ${snapshot.length} books updated. The remaining request was rejected (${error.status}). Check your permissions and selection before retrying.`
                : `${succeeded} of ${snapshot.length} books confirmed updated. Other books remain selected, but some outcomes could not be confirmed. Review your library before retrying.`);
            return false;
        } finally {
            pending.current = false;
            selection.setBusy(false);
        }
    }

    if (count === 0 && !selection.busy && !feedback) return null;

    return <Stack as="section" aria-label="Bulk book actions" gap={2} w="fit-content"
        maxW="calc(100vw - 32px - env(safe-area-inset-left) - env(safe-area-inset-right))"
        borderWidth="1px" borderRadius="xl" px={3} py={1} bg="bg" boxShadow="lg" position="fixed"
        bottom="calc(16px + env(safe-area-inset-bottom))" right="calc(16px + env(safe-area-inset-right))" zIndex="sticky">
        <Flex align="center" gap={2} wrap="wrap">
            <Popover.Root lazyMount unmountOnExit positioning={{placement: "top-end"}}>
                <Popover.Trigger asChild>
                    <Button variant="ghost" size="sm" minH="44px" px={2} disabled={count === 0}
                        title="Review selections, including books on other pages and under other filters">
                        <Text fontWeight="medium" role="status">{count} book{count === 1 ? "" : "s"} selected{selection.busy ? " (working...)" : ""}</Text>
                    </Button>
                </Popover.Trigger>
                <Portal><Popover.Positioner><Popover.Content maxW="min(320px, calc(100vw - 32px))">
                    <Popover.Body>
                        <Stack gap={2}>
                            <Popover.Title fontSize="sm" fontWeight="semibold">Selected books</Popover.Title>
                            <Text fontSize="xs" color="fg.muted">Includes selections across pages and filters.</Text>
                            <Stack gap={1} maxH="240px" overflowY="auto">
                                {books.map(book => <Flex key={book.id} gap={2} justify="space-between" align="center">
                                    <Text fontSize="sm" overflowWrap="anywhere">{book.title}</Text>
                                    <IconButton variant="ghost" size="sm" minH="44px" minW="44px" flexShrink={0} disabled={selection.busy}
                                        aria-label={`Deselect ${book.title}`} onClick={() => selection.remove([book.id])}><LuX/></IconButton>
                                </Flex>)}
                            </Stack>
                        </Stack>
                    </Popover.Body>
                </Popover.Content></Popover.Positioner></Portal>
            </Popover.Root>
            <Menu.Root lazyMount unmountOnExit positioning={{placement: "top-end"}}>
                <Menu.Trigger asChild>
                    <Button variant="ghost" size="sm" minH="44px" disabled={disabled} aria-label="Choose bulk action">
                        {actionChoices.find(choice => choice.action === action)?.label ?? "Actions"}<LuChevronDown/>
                    </Button>
                </Menu.Trigger>
                <Portal><Menu.Positioner><Menu.Content minW="230px" borderRadius="lg">
                    {actionChoices.filter(choice => choice.action !== "assign-owner" || isAdmin).map(choice => (
                        <Menu.Item key={choice.action} value={choice.action} minH="44px"
                            color={choice.action === "delete" ? "fg.error" : undefined}
                            onSelect={() => {setAction(choice.action); setFeedback(""); setFailures([]);}}>
                            <choice.icon/>{choice.label}
                        </Menu.Item>
                    ))}
                </Menu.Content></Menu.Positioner></Portal>
            </Menu.Root>
            {isShelfAction && <NativeSelect.Root width={{base: "full", sm: "220px"}} size="sm"
                disabled={selection.busy || shelves.isFetching || shelves.isError}>
                <NativeSelect.Field aria-label="Bulk action bookshelf" minH="44px" value={shelfId} onChange={event => setShelfId(event.target.value)}>
                    <option value="">Choose a bookshelf</option>
                    {shelves.data?.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}
                </NativeSelect.Field><NativeSelect.Indicator/>
            </NativeSelect.Root>}
            {isAdmin && action === "assign-owner" && <NativeSelect.Root width={{base: "full", sm: "260px"}} size="sm"
                disabled={selection.busy || users.isFetching || users.isError}>
                <NativeSelect.Field aria-label="Bulk action owner" minH="44px" value={ownerId} onChange={event => setOwnerId(event.target.value)}>
                    <option value="">Choose a book owner</option>
                    <option value="unowned">No owner</option>
                    {users.data?.map(item => <option key={item.id} value={item.id}>{item.name} ({item.email})</option>)}
                </NativeSelect.Field><NativeSelect.Indicator/>
            </NativeSelect.Root>}
            {action === "delete" ? <ConfirmAction title={`Delete ${count} selected book${count === 1 ? "" : "s"}?`}
                description="Permanently delete every selected book and all of its formats, including books selected on other pages or under other filters. This cannot be undone."
                actionLabel="Delete selected books" destructive disabled={disabled || !canDelete}
                errorText={feedback || "Books could not be deleted. Review your selection and try again."}
                onConfirm={() => run("delete")}/>
                : action === "assign-owner" && isAdmin ? <ConfirmAction title={`Change ownership of ${count} selected book${count === 1 ? "" : "s"}?`}
                    description={`Replace the owner of all selected books, including books not currently displayed, with ${ownerId === "unowned" ? "no owner" : owner?.name ?? "the selected owner"}.`}
                    actionLabel="Assign ownership" disabled={disabled || !ownerValid || users.isFetching || users.isError}
                    errorText={feedback || "Ownership could not be changed. Review your selection and try again."} onConfirm={() => run("assign-owner")}/>
                    : action && <Button size="sm" minH="44px" variant="solid" loading={selection.busy} loadingText="Applying"
                        disabled={disabled || (isShelfAction && (!shelf || shelves.isFetching || shelves.isError))}
                        onClick={() => run(action)}>Apply</Button>}
            <IconButton variant="ghost" size="sm" minH="44px" minW="44px" ml="auto" aria-label="Clear selection"
                disabled={selection.busy} onClick={() => {selection.clear(); setAction(""); setFeedback(""); setFailures([]);}}>
                <LuX/>
            </IconButton>
        </Flex>
        {action === "delete" && count > 0 && !canDelete && <Text fontSize="xs" color="fg.muted" pb={2}>
            Only administrators or book owners can delete books. Deselect books you do not own to enable deletion.
        </Text>}
        {isShelfAction && shelves.isError && <ErrorState onRetry={shelves.refetch}>Bookshelves could not be loaded. Bookshelf actions are unavailable.</ErrorState>}
        {isAdmin && action === "assign-owner" && users.isError && <ErrorState onRetry={users.refetch}>Owners could not be loaded. Ownership assignment is unavailable.</ErrorState>}
        {feedback && <Stack role="alert" gap={2}>
            <Text color="fg.error">{feedback}</Text>
            {failures.map((failure, index) => <Text key={index} fontSize="sm">{failure.title}: {failure.message}</Text>)}
        </Stack>}
    </Stack>;
}
