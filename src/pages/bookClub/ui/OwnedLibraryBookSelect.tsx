import {useState} from "react";
import {Button, HStack, Input, Spinner, Stack, Text} from "@chakra-ui/react";
import {useDebounce} from "@uidotdev/usehooks";
import {AddBookButton, type BookModel, useSearchMyBooksQuery} from "@/entities/book";
import {LuCheck, LuSearch} from "react-icons/lu";

type OwnedLibraryBookSelectProps = {
    id: string; label: string; selectedBookId?: string;
    onSelect: (book: BookModel | null) => void; disabled?: boolean;
};

export function OwnedLibraryBookSelect({id, label, selectedBookId, onSelect, disabled = false}: OwnedLibraryBookSelectProps) {
    const [query, setQuery] = useState("");
    const [selected, setSelected] = useState<BookModel | null>(null);
    const debounced = useDebounce(query.trim(), 250);
    const canSearch = debounced.length >= 2;
    const {data: books = [], isFetching, error, refetch} = useSearchMyBooksQuery(debounced, {skip: !canSearch});
    const stale = query.trim() !== debounced;
    return <Stack gap={3}>
        <label htmlFor={`${id}-search`}>{label}</label>
        <HStack><LuSearch/><Input id={`${id}-search`} placeholder="Search your library by title or author" value={query}
            disabled={disabled} autoComplete="off" minH="44px" aria-describedby={`${id}-help`}
            onChange={e => {setQuery(e.target.value); onSelect(null); setSelected(null);}}/></HStack>
        <Text id={`${id}-help`} color="fg.muted" fontSize="sm">Choose a book you've added to your own library. Type at least 2 characters to search.</Text>
        {selectedBookId && selected?.id === selectedBookId ? <HStack borderWidth="1px" borderColor="orange.400" borderRadius="lg" p={3}>
            <LuCheck/><Stack gap={0}><Text fontWeight="semibold">{selected.title}</Text><Text color="fg.muted" fontSize="sm">{selected.author}</Text></Stack>
        </HStack> : canSearch && !stale && (isFetching ? <HStack role="status"><Spinner size="sm"/><Text fontSize="sm">Searching your library...</Text></HStack>
            : error ? <Stack><Text role="alert" color="fg.error">Your library couldn't be searched.</Text><Button variant="outline" onClick={() => refetch()}>Try again</Button></Stack>
                : books.length ? <Stack as="ul" gap={1} maxH="240px" overflowY="auto" aria-label={`${label} results`}>
                    {books.map(book => <li key={book.id} style={{listStyle: "none"}}><Button variant="ghost" w="full" minH="56px" h="auto" p={3} justifyContent="start" whiteSpace="normal" textAlign="start"
                        disabled={disabled} onClick={() => {setSelected(book); onSelect(book);}}>
                        <Stack gap={0}><Text fontWeight="medium">{book.title}</Text><Text color="fg.muted" fontSize="sm">{book.author}</Text></Stack>
                    </Button></li>)}
                </Stack> : <Text color="fg.muted" fontSize="sm">No matching books in your library. Try another title or add your book first.</Text>)}
        <AddBookButton width="auto" alignSelf="start" minH="44px" disabled={disabled}/>
    </Stack>;
}
