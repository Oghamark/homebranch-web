import {useMemo, useState} from "react";
import {createListCollection, Input, Portal, Select, Spinner, Stack, Text} from "@chakra-ui/react";
import {useDebounce} from "@uidotdev/usehooks";
import {type BookModel, useSearchBooksQuery} from "@/entities/book";

type OwnedLibraryBookSelectProps = {
    id: string;
    label: string;
    selectedBookId?: string;
    onSelect: (book: BookModel | null) => void;
    disabled?: boolean;
};

export function OwnedLibraryBookSelect({id, label, selectedBookId, onSelect, disabled = false}: OwnedLibraryBookSelectProps) {
    const [query, setQuery] = useState("");
    const currentUserId = sessionStorage.getItem("user_id") ?? undefined;
    const debouncedQuery = useDebounce(query, 250);
    const canSearch = Boolean(currentUserId && debouncedQuery.trim().length >= 2);
    const {data: books = [], isFetching, error} = useSearchBooksQuery(
        {query: debouncedQuery, userId: currentUserId},
        {skip: !canSearch},
    );
    const collection = useMemo(() => createListCollection({
        items: books,
        itemToValue: (book) => book.id,
        itemToString: (book) => `${book.title} · ${book.author}`,
    }), [books]);

    return <Stack gap={2}>
        <label htmlFor={`${id}-search`}>{label}</label>
        <Input
            id={`${id}-search`}
            placeholder="Search your library by title or author"
            value={query}
            disabled={disabled || !currentUserId}
            onChange={(event) => {
                setQuery(event.target.value);
                onSelect(null);
            }}
        />
        {!currentUserId ? <Text role="alert" color="fg.error" fontSize="sm">Your account session is unavailable, so your library cannot be searched.</Text>
            : debouncedQuery.trim().length < 2 ? <Text color="fg.muted" fontSize="sm">Enter at least 2 characters to search your library.</Text>
                : isFetching ? <Spinner size="sm"/>
                    : error ? <Text role="alert" color="fg.error" fontSize="sm">Your library could not be searched. Try again.</Text>
                        : <Select.Root
                            collection={collection}
                            value={selectedBookId ? [selectedBookId] : []}
                            onValueChange={(details) => onSelect(books.find((book) => book.id === details.value[0]) ?? null)}
                            disabled={disabled || books.length === 0}
                        >
                            <Select.HiddenSelect/>
                            <Select.Label>Select a book from your library</Select.Label>
                            <Select.Control>
                                <Select.Trigger aria-label={`${label} candidates`}>
                                    <Select.ValueText placeholder={books.length ? "Choose a book" : "No matching books"}/>
                                </Select.Trigger>
                                <Select.IndicatorGroup><Select.Indicator/></Select.IndicatorGroup>
                            </Select.Control>
                            <Portal>
                                <Select.Positioner>
                                    <Select.Content>
                                        {collection.items.map((book) => <Select.Item key={book.id} item={book}>
                                            <Select.ItemText>{book.title} · {book.author}</Select.ItemText>
                                            <Select.ItemIndicator/>
                                        </Select.Item>)}
                                    </Select.Content>
                                </Select.Positioner>
                            </Portal>
                        </Select.Root>}
    </Stack>;
}
