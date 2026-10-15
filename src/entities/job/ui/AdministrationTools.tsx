import {Box, Button, Checkbox, Flex, NativeSelect, Stack, Text} from "@chakra-ui/react";
import type {BookDuplicateWithBooksModel, BookModel, ResolveDuplicateAction} from "@/entities/book";
import type {UserModel} from "@/entities/user";
import {ConfirmAction} from "@/shared/ui/EditorialUI";

export function PaginationControls({page, total, perPage, onPage}: {
    page: number; total: number; perPage: number; onPage: (page: number) => void;
}) {
    return <Flex justify="space-between" align="center" gap={2} wrap="wrap">
        <Text fontSize="sm" color="fg.muted">Page {page + 1} of {Math.max(1, Math.ceil(total / perPage))} ({total} total)</Text>
        <Flex gap={2}>
            <Button variant="outline" minH="44px" onClick={() => onPage(page - 1)} disabled={page === 0}>Previous</Button>
            <Button variant="outline" minH="44px" onClick={() => onPage(page + 1)} disabled={(page + 1) * perPage >= total}>Next</Button>
        </Flex>
    </Flex>;
}

export function OwnershipBooks({books, selectedIds, onToggle, onToggleAll, ownerLabel, disabled}: {
    books: BookModel[]; selectedIds: Set<string>; onToggle: (id: string) => void; onToggleAll: () => void;
    ownerLabel: (book: BookModel) => string; disabled?: boolean;
}) {
    const count = books.filter(book => selectedIds.has(book.id)).length;
    return <Stack gap={2}>
        <Checkbox.Root minH="44px" checked={count === books.length && count > 0 ? true : count > 0 ? "indeterminate" : false}
            disabled={disabled} onCheckedChange={onToggleAll}>
            <Checkbox.HiddenInput/><Checkbox.Control/><Checkbox.Label>Select all books on this page</Checkbox.Label>
        </Checkbox.Root>
        {books.map(book => <Flex key={book.id} p={3} gap={3} align="start" borderWidth="1px" borderRadius="lg" minW={0}>
            <Checkbox.Root minH="44px" checked={selectedIds.has(book.id)} disabled={disabled} onCheckedChange={() => onToggle(book.id)}>
                <Checkbox.HiddenInput aria-label={`Select ${book.title}`}/><Checkbox.Control/>
            </Checkbox.Root>
            <Stack gap={1} minW={0} flex={1} overflowWrap="anywhere">
                <Text fontWeight="semibold">{book.title}</Text>
                <Text fontSize="sm" color="fg.muted">{book.author}</Text>
                <Text fontSize="sm">Owner: {ownerLabel(book)}</Text>
                <Text fontSize="xs" color="fg.muted">{book.fileName}</Text>
            </Stack>
        </Flex>)}
    </Stack>;
}

export function BulkActionBar({selectedCount, users, userId, onUserChange, onAssign, disabled, errorText}: {
    selectedCount: number; users: UserModel[]; userId: string; onUserChange: (id: string) => void;
    onAssign: () => Promise<unknown>; disabled?: boolean; errorText?: string;
}) {
    const user = users.find(candidate => candidate.id === userId);
    return <Stack p={4} bg="bg.subtle" borderRadius="lg" gap={3}>
        <Text fontWeight="medium" role="status">{selectedCount} book{selectedCount === 1 ? "" : "s"} selected on this page</Text>
        <Text fontSize="sm" color="fg.muted">Selections are limited to this page and clear when you change the page, search, or ownership filter.</Text>
        <Flex gap={3} wrap="wrap" align="center">
            <NativeSelect.Root w={{base: "full", md: "sm"}} disabled={disabled}>
                <NativeSelect.Field aria-label="New book owner" minH="44px" value={userId}
                    onChange={event => onUserChange(event.target.value)}>
                    <option value="">Select a new owner</option>
                    {users.map(user => <option key={user.id} value={user.id}>{user.name} ({user.email})</option>)}
                </NativeSelect.Field><NativeSelect.Indicator/>
            </NativeSelect.Root>
            <ConfirmAction title={`Assign ${selectedCount} selected book${selectedCount === 1 ? "" : "s"} to ${user?.name ?? "a new owner"}?`}
                description={`Change ownership of only the ${selectedCount} selected books on this page to ${user?.name ?? ""} (${user?.email ?? ""}). Their current ownership will be replaced. Books on other pages are not affected.`}
                actionLabel="Assign ownership" onConfirm={onAssign} disabled={disabled || selectedCount === 0 || !user}
                errorText={errorText ?? "Ownership could not be changed. Your selection is kept. Please try again."}/>
        </Flex>
    </Stack>;
}

export function DuplicatePairCard({item, onResolve, disabled}: {
    item: BookDuplicateWithBooksModel; onResolve: (action: ResolveDuplicateAction) => Promise<unknown>; disabled?: boolean;
}) {
    const {suspectBook, originalBook} = item;
    const actions: {action: ResolveDuplicateAction; label: string; description: string; destructive?: boolean}[] = [
        {action: "merge", label: "Keep existing book", destructive: true,
            description: `Keep "${originalBook.title}" by ${originalBook.author}. Delete the new upload "${suspectBook.title}" by ${suspectBook.author}.`},
        {action: "replace", label: "Use new upload", destructive: true,
            description: `Keep the new upload "${suspectBook.title}" by ${suspectBook.author}. Delete the existing book "${originalBook.title}" by ${originalBook.author}.`},
        {action: "keep_both", label: "Keep both books",
            description: `Keep "${suspectBook.title}" and "${originalBook.title}" as separate books and dismiss this duplicate match.`},
    ];
    return <Stack borderWidth="1px" borderRadius="xl" p={4} gap={4}>
        <Flex gap={4} direction={{base: "column", md: "row"}}>
            {[{label: "New upload", book: suspectBook}, {label: "Existing book", book: originalBook}].map(({label, book}) =>
                <Box key={label} flex={1} minW={0} overflowWrap="anywhere">
                    <Text fontSize="sm" color="fg.muted">{label}</Text>
                    <Text fontWeight="semibold">{book.title}</Text><Text fontSize="sm">{book.author}</Text>
                    {book.isbn && <Text fontSize="sm">ISBN: {book.isbn}</Text>}
                    <Text fontSize="xs" color="fg.muted">{book.fileName}</Text>
                </Box>)}
        </Flex>
        <Flex gap={2} wrap="wrap">
            {actions.map(({action, label, description, destructive}) => <ConfirmAction key={action}
                title={`${label} for "${suspectBook.title}"?`} description={description} actionLabel={label}
                destructive={destructive} disabled={disabled} onConfirm={() => onResolve(action)}
                errorText="The result could not be confirmed. Review this duplicate pair and try again." />)}
        </Flex>
    </Stack>;
}
