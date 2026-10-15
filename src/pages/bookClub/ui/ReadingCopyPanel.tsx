import {useState} from "react";
import {Button, CloseButton, Dialog, Heading, HStack, NativeSelect, Portal, Stack, Text} from "@chakra-ui/react";
import {Link} from "react-router";
import {LuBookOpen, LuCheck, LuChevronRight} from "react-icons/lu";
import {config} from "@/shared";
import {type BookClub, useClearReadingCopyMutation, useConfirmReadingCopyMatchMutation, useGetReadingCopyMatchesQuery, useGetReadingCopyQuery, useSetReadingCopyMutation} from "@/entities/bookClub";
import {type BookModel} from "@/entities/book";
import {OwnedLibraryBookSelect} from "./OwnedLibraryBookSelect";
import {clubPalette, ClubLoading, ConfirmAction, ErrorState} from "./ClubUI";

export function ReadingCopyPanel({club}: {club: BookClub}) {
    const args = {clubId: club.id, workId: club.selectedWork.id};
    const query = useGetReadingCopyQuery(args);
    const [open, setOpen] = useState(false);
    const [clear] = useClearReadingCopyMutation();
    const available = query.data?.available && query.data.book;
    const archived = club.status === "archived";
    return <Stack gap={4} p={{base: 5, md: 6}} borderWidth="1px" borderRadius="xl" bg="bg.panel">
        <Text fontSize="xs" fontWeight="bold" letterSpacing="wider" textTransform="uppercase" color="fg.muted">Your reading space</Text>
        {query.isLoading ? <ClubLoading/> : query.error ? <ErrorState onRetry={query.refetch}>We couldn't check your book. You can still join the conversation.</ErrorState> : available ? <>
            <Heading size="xl" fontFamily="Georgia, serif">Ready for another chapter?</Heading>
            <Text color="fg.muted">Your copy of <Text as="span" color="fg" fontWeight="medium">{query.data!.book!.title}</Text> is ready whenever you are.</Text>
            <HStack wrap="wrap"><Button asChild minH="44px" colorPalette="orange"><Link to={`/books/${query.data!.book!.id}`}><LuBookOpen/> Open book</Link></Button>
                {!archived && <Button variant="ghost" minH="44px" onClick={() => setOpen(true)}>Change copy</Button>}</HStack>
            {!archived && <details><summary style={{cursor: "pointer", paddingBlock: "12px"}}>Book options</summary><Stack gap={3} mt={2} align="start">
                <Text fontSize="sm" color="fg.muted">Your choice and edition details are private. Changing or removing this copy resets your club progress, not your reading history.</Text>
                <ConfirmAction title="Remove your reading copy?" description="Your club progress and private chapter labels for this book will be cleared. The book stays in your library, and your private reading history is unchanged."
                    actionLabel="Remove copy" destructive onConfirm={() => clear(args).unwrap()}/>
            </Stack></details>}
        </> : <>
            <Heading size="xl" fontFamily="Georgia, serif">{archived ? "Your club reading space" : "Make this read your own."}</Heading>
            <Text color="fg.muted">{query.data?.source !== "none" && query.data?.source ? "Your previous copy is no longer available. Choose another to continue tracking your club progress." : "Connect a book from your library to keep track of the reading plan. Your library and reading history stay private."}</Text>
            {!archived && <Button colorPalette="orange" minH="44px" alignSelf="start" onClick={() => setOpen(true)}>Choose your copy <LuChevronRight/></Button>}
            <Text fontSize="sm" color="fg.muted">No copy yet? You can still read the plan and take part in discussions.</Text>
        </>}
        {open && <CopyChooser club={club} replacing={query.data?.source !== "none" && !!query.data?.source} onClose={() => setOpen(false)}/>}
    </Stack>;
}

function CopyChooser({club, replacing, onClose}: {club: BookClub; replacing: boolean; onClose: () => void}) {
    const args = {clubId: club.id, workId: club.selectedWork.id};
    const matches = useGetReadingCopyMatchesQuery(args);
    const [confirm, confirmation] = useConfirmReadingCopyMatchMutation();
    const [setCopy, saving] = useSetReadingCopyMutation();
    const [selected, setSelected] = useState<BookModel | null>(null);
    const [source, setSource] = useState<"personal" | "shared">("personal");
    const busy = confirmation.isLoading || saving.isLoading;
    const choose = async (bookId: string, suggested: boolean) => {
        if (suggested) await confirm({...args, bookId}).unwrap();
        else await setCopy({...args, bookId, source}).unwrap();
        onClose();
    };
    const action = (bookId: string, suggested: boolean) => replacing
        ? <ConfirmAction title="Change your reading copy?" description="Changing copies clears your club progress and private chapter labels for this book. Your library and private reading history are unchanged."
            actionLabel="Choose this copy" onConfirm={() => choose(bookId, suggested)} disabled={busy}/>
        : <Button minH="44px" colorPalette="orange" loading={busy} onClick={() => {void choose(bookId, suggested).catch(() => {/* Mutation error is displayed below. */});}}>Choose this copy</Button>;
    return <Dialog.Root open onOpenChange={({open}) => {if (!open && !busy) onClose();}} closeOnInteractOutside={!busy} closeOnEscape={!busy}>
        <Portal><Dialog.Backdrop/><Dialog.Positioner p={4}><Dialog.Content css={clubPalette} maxW="600px" maxH="90dvh" overflowY="auto">
            <Dialog.Header><Dialog.Title fontFamily="Georgia, serif" fontSize="2xl">Choose your reading copy</Dialog.Title></Dialog.Header>
            <Dialog.Body><Stack gap={5}>
                <Text color="fg.muted">Pick the copy you will read. This does not share your book or reading history with anyone.</Text>
                <Stack gap={3}><Heading size="md">Found in your library</Heading>
                    {matches.isLoading ? <ClubLoading/> : matches.error ? <ErrorState onRetry={matches.refetch}>We couldn't check for suggestions. You can search below instead.</ErrorState>
                        : matches.data?.length ? matches.data.map(match => <Stack key={match.bookId} borderWidth="1px" borderRadius="lg" p={4} gap={3}>
                            <HStack><LuCheck/><Text fontWeight="medium">{match.title}</Text></HStack><Text color="fg.muted" fontSize="sm">{match.author}</Text>
                            <details><summary style={{cursor: "pointer", paddingBlock: "12px"}}>Match details</summary><Text fontSize="sm" color="fg.muted">{match.method === "identifier" ? "Matched by book identifier" : "Suggested by title and author"} · {Math.round(match.confidence * 100)}% confidence. Please check that this is the right book.</Text></details>
                            {action(match.bookId, true)}
                        </Stack>) : <Text color="fg.muted" fontSize="sm">No suggestions this time. Search your library below to choose your copy.</Text>}
                </Stack>
                <OwnedLibraryBookSelect id="personal-copy" label="Find a different copy" selectedBookId={selected?.id} onSelect={setSelected} disabled={busy}/>
                {!config.cloudMode && <details><summary style={{cursor: "pointer", paddingBlock: "12px"}}>Advanced copy options</summary>
                    <Stack gap={2} mt={2}><label htmlFor="copy-source">Copy source</label><NativeSelect.Root><NativeSelect.Field id="copy-source" value={source} onChange={e => setSource(e.target.value === "shared" ? "shared" : "personal")}>
                        <option value="personal">Personal copy</option><option value="shared">Shared instance copy</option>
                    </NativeSelect.Field><NativeSelect.Indicator/></NativeSelect.Root><Text fontSize="sm" color="fg.muted">Records how you access this copy. It does not change library permissions.</Text></Stack>
                </details>}
                {selected && action(selected.id, false)}
                {(confirmation.error || saving.error) && <Text role="alert" color="fg.error">That copy couldn't be selected. Check that it is still available and try again.</Text>}
            </Stack></Dialog.Body>
            <Dialog.Footer><Button variant="ghost" minH="44px" onClick={onClose} disabled={busy}>Done</Button></Dialog.Footer>
            <Dialog.CloseTrigger asChild><CloseButton disabled={busy}/></Dialog.CloseTrigger>
        </Dialog.Content></Dialog.Positioner></Portal>
    </Dialog.Root>;
}
