import {useState} from "react";
import {Badge, Box, Button, CloseButton, Dialog, Flex, Grid, Heading, HStack, Input, Portal, Stack, Text, Textarea} from "@chakra-ui/react";
import {Link, useNavigate, useSearchParams} from "react-router";
import {LuArrowRight, LuPlus, LuSearch} from "react-icons/lu";
import {type BookClub, type BookClubVisibility, useCreateBookClubMutation, useGetArchivedBookClubsQuery, useGetBookClubsQuery} from "@/entities/bookClub";
import {type BookModel} from "@/entities/book";
import {config} from "@/shared/config";
import {OwnedLibraryBookSelect} from "./OwnedLibraryBookSelect";
import {BookJacket, clubPalette, ClubLoading, EmptyState, ErrorState} from "./ClubUI";
import {ClubInvitations} from "@/features/social/ClubInvitations";

export function filterClubs(clubs: BookClub[], view: string, query: string) {
    const needle = query.trim().toLocaleLowerCase();
    return clubs.filter(club => (view === "archived" || (view === "discover" ? !club.currentMembershipRole : !!club.currentMembershipRole))
        && `${club.name} ${club.selectedWork.title} ${club.selectedWork.author}`.toLocaleLowerCase().includes(needle));
}

export function BookClubsPage() {
    const [params, setParams] = useSearchParams();
    const view = ["discover", "archived", "invitations"].includes(params.get("view") ?? "") ? params.get("view")! : "mine";
    const [search, setSearch] = useState("");
    const active = useGetBookClubsQuery();
    const archived = useGetArchivedBookClubsQuery(undefined, {skip: view !== "archived"});
    const query = view === "archived" ? archived : active;
    const clubs = filterClubs(query.data ?? [], view, search);
    return <Stack data-book-club css={clubPalette} gap={7} maxW="1000px" mx="auto" py={{base: 5, md: 9}} pb={12}>
        <Flex justify="space-between" align="center" wrap="wrap" gap={4}>
            <Stack gap={2}><Text textTransform="uppercase" letterSpacing="widest" fontSize="xs" color="fg.muted" fontWeight="bold">A shared reading life</Text>
                <Heading as="h1" size="3xl" fontFamily="Georgia, serif">Your next chapter, together.</Heading>
                <Text color="fg.muted" maxW="55ch">Find your people, settle into a good book, and make room for conversation.</Text></Stack>
            <CreateClubForm/>
        </Flex>
        <Flex justify="space-between" align="center" gap={4} wrap="wrap">
            <HStack as="nav" aria-label="Book club views" gap={1} wrap="wrap">
                {[["mine", "My clubs"], ["discover", "Discover"], ["invitations", "Invitations"], ["archived", "Archived"]].map(([value, label]) =>
                    <Button key={value} minH="44px" variant={view === value ? "solid" : "ghost"} colorPalette={view === value ? "orange" : undefined}
                        aria-current={view === value ? "page" : undefined} onClick={() => {setParams(value === "mine" ? {} : {view: value}); setSearch("");}}>{label}</Button>)}
            </HStack>
            {view !== "invitations" && <Box position="relative" w={{base: "full", sm: "280px"}}>
                <Box position="absolute" left={3} top="14px" color="fg.muted"><LuSearch/></Box>
                <Input aria-label="Find a club" placeholder="Find a club or book" pl={10} minH="44px" value={search} onChange={e => setSearch(e.target.value)}/>
            </Box>}
        </Flex>
        {view === "discover" && <Text color="fg.muted" fontSize="sm">Clubs open to everyone. Private clubs are only visible to their members.</Text>}
        {view === "invitations" ? <ClubInvitations/> : query.isLoading ? <ClubLoading/> : query.error ? <ErrorState onRetry={query.refetch}>Book clubs couldn't be loaded. Your reading spaces will be here when you reconnect.</ErrorState>
            : !clubs.length ? <EmptyState title={search ? "No matching clubs" : view === "mine" ? "Make a little room for reading together" : view === "archived" ? "No archived clubs" : "No new clubs to discover"}
                action={view === "mine" && !search ? <Button colorPalette="orange" minH="44px" onClick={() => setParams({view: "discover"})}>Discover clubs <LuArrowRight/></Button> : search ? <Button variant="outline" onClick={() => setSearch("")}>Clear search</Button> : undefined}>
                {search ? "Try a different club name, book title, or author." : view === "mine" ? "Join a club to share your next read, or start one of your own." : view === "archived" ? "Clubs you've finished will appear here when their owner archives them." : "Start a club of your own, or check back for something new."}
            </EmptyState> : <Grid templateColumns={{base: "1fr", md: "repeat(2, minmax(0, 1fr))"}} gap={5}>
                {clubs.map(club => <ClubCard key={club.id} club={club}/>)}
            </Grid>}
    </Stack>;
}

function ClubCard({club}: {club: BookClub}) {
    return <Box asChild borderWidth="1px" borderRadius="xl" p={{base: 5, md: 6}} bg="bg.panel" transition="border-color 0.15s"
        _hover={{borderColor: "orange.400"}} _focusVisible={{outline: "2px solid", outlineColor: "orange.500", outlineOffset: "3px"}}>
        <Link to={`/book-clubs/${club.id}`}>
            <Stack gap={5} h="full">
                <HStack align="start" gap={4}><BookJacket compact title={club.selectedWork.title} author={club.selectedWork.author}
                    coverSrc={club.selectedWork.coverImageFileName ? `${config.apiUrl}/uploads/cover-images/${encodeURIComponent(club.selectedWork.coverImageFileName)}` : undefined}/>
                    <Stack gap={2} minW={0}><Badge alignSelf="start" variant="subtle" colorPalette="orange">{club.currentMembershipRole ? "Your club" : "Open to join"}</Badge>
                        <Heading size="xl" fontFamily="Georgia, serif" overflowWrap="anywhere">{club.name}</Heading>
                        <Text fontSize="sm" color="fg.muted">{club.selectedWork.title} · {club.selectedWork.author}</Text></Stack></HStack>
                {club.description && <Text color="fg.muted" lineClamp={2} fontSize="sm" overflowWrap="anywhere">{club.description}</Text>}
                <HStack justify="end" mt="auto">
                    <HStack fontSize="sm" fontWeight="semibold"><Text>{club.currentMembershipRole ? "Visit club" : "Take a look"}</Text><LuArrowRight/></HStack></HStack>
            </Stack>
        </Link>
    </Box>;
}

function CreateClubForm() {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [selectedBook, setSelectedBook] = useState<BookModel | null>(null);
    const [visibility, setVisibility] = useState<BookClubVisibility>("instance_visible");
    const [create, state] = useCreateBookClubMutation();
    const navigate = useNavigate();
    const close = () => {if (!state.isLoading) {setOpen(false); state.reset(); setName(""); setDescription(""); setSelectedBook(null); setVisibility("instance_visible");}};
    return <Dialog.Root open={open} onOpenChange={({open: next}) => {if (next) setOpen(true); else close();}} closeOnInteractOutside={!state.isLoading} closeOnEscape={!state.isLoading}>
        <Dialog.Trigger asChild><Button colorPalette="orange" minH="44px"><LuPlus/> Create club</Button></Dialog.Trigger>
        <Portal><Dialog.Backdrop/><Dialog.Positioner p={4}><Dialog.Content css={clubPalette} maxW="560px" maxH="90dvh" overflowY="auto">
            <Dialog.Header><Dialog.Title fontFamily="Georgia, serif" fontSize="2xl">Start something worth sharing.</Dialog.Title></Dialog.Header>
            <Dialog.Body as="form" id="create-club" onSubmit={async e => {
                e.preventDefault();
                if (!name.trim() || !selectedBook) return;
                try {
                    const club = await create({name: name.trim(), description: description.trim() || undefined, visibility,
                        selectedWork: {title: selectedBook.title, author: selectedBook.author, isbn: selectedBook.isbn, series: selectedBook.series, seriesPosition: selectedBook.seriesPosition}}).unwrap();
                    close(); navigate(`/book-clubs/${club.id}`);
                } catch { /* The mutation error is displayed below. */ }
            }}><Stack gap={5}>
                <Text color="fg.muted">Choose a book from your library. You can invite people and plan your read after creating the club.</Text>
                <Stack gap={2}><label htmlFor="club-name">Club name</label><Input id="club-name" autoComplete="off" placeholder="The Sunday reading circle" required maxLength={120} value={name} onChange={e => setName(e.target.value)}/></Stack>
                <OwnedLibraryBookSelect id="club-work" label="What are you reading?" selectedBookId={selectedBook?.id} onSelect={setSelectedBook}/>
                <Stack gap={2}><label htmlFor="create-description">A few words about your club (optional)</label><Textarea id="create-description" value={description} maxLength={3000} onChange={e => setDescription(e.target.value)}/></Stack>
                <Stack as="fieldset" gap={3}><Text as="legend" fontWeight="medium">Who can join?</Text>
                    <Box as="label" display="flex" alignItems="center" gap={3} minH="44px"><input type="radio" name="visibility" value="instance_visible" checked={visibility === "instance_visible"} onChange={() => setVisibility("instance_visible")}/> Open to everyone</Box>
                    <Box as="label" display="flex" alignItems="center" gap={3} minH="44px"><input type="radio" name="visibility" value="private" checked={visibility === "private"} onChange={() => setVisibility("private")}/> Private: invitation only</Box>
                    <Text fontSize="sm" color="fg.muted">Your library and reading history stay private either way.</Text>
                </Stack>
                {state.error && <Text role="alert" color="fg.error">We couldn't create your club. Your details are still here. Check your connection and try again.</Text>}
            </Stack></Dialog.Body>
            <Dialog.Footer><Button minH="44px" variant="ghost" onClick={close} disabled={state.isLoading}>Cancel</Button>
                <Button form="create-club" type="submit" minH="44px" colorPalette="orange" loading={state.isLoading} disabled={!name.trim() || !selectedBook}>Create club <LuArrowRight/></Button></Dialog.Footer>
            <Dialog.CloseTrigger asChild><CloseButton disabled={state.isLoading}/></Dialog.CloseTrigger>
        </Dialog.Content></Dialog.Positioner></Portal>
    </Dialog.Root>;
}
