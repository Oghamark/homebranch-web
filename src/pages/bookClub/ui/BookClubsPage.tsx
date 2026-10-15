import {useState} from "react";
import {Button, Card, Flex, Heading, HStack, Input, Loader, Stack, Text, Textarea, createListCollection, Portal, Select} from "@chakra-ui/react";
import {Link} from "react-router";
import {useCreateBookClubMutation, useGetArchivedBookClubsQuery, useGetBookClubsQuery} from "@/entities/bookClub";
import {type BookModel} from "@/entities/book";
import {OwnedLibraryBookSelect} from "./OwnedLibraryBookSelect";

const visibilityCollection = createListCollection({
    items: [
        {value: "instance_visible", label: "Public"},
        {value: "private", label: "Private"},
    ],
});

export function BookClubsPage() {
    const [archived, setArchived] = useState(false);
    const {data: active = [], isLoading, error} = useGetBookClubsQuery();
    const archivedQuery = useGetArchivedBookClubsQuery(undefined, {skip: !archived});
    const clubs = archived ? archivedQuery.data ?? [] : active;
    const loading = archived ? archivedQuery.isLoading : isLoading;
    const failed = archived ? archivedQuery.error : error;

    return <Stack gap={5} maxW="960px" mx="auto">
        <Flex justify="space-between" align="center" wrap="wrap" gap={3}>
            <Heading size="xl">Book clubs</Heading>
            <HStack><Button size="sm" variant={!archived ? "solid" : "outline"} onClick={() => setArchived(false)}>Active</Button><Button size="sm" variant={archived ? "solid" : "outline"} onClick={() => setArchived(true)}>Archived</Button></HStack>
        </Flex>
        <CreateClubForm/>
        {loading ? <Flex py={8} justify="center"><Loader/></Flex> : failed ? <Card.Root><Card.Body><Stack align="center"><Heading size="md">Book clubs are unavailable.</Heading><Text color="fg.muted">Try again when the service is available.</Text></Stack></Card.Body></Card.Root> : clubs.length === 0 ? <Card.Root><Card.Body><Text color="fg.muted">{archived ? "No archived clubs are available to you." : "No active book clubs are available to you."}</Text></Card.Body></Card.Root> : clubs.map((club) => <Card.Root key={club.id} asChild><Link to={`/book-clubs/${club.id}`}><Card.Body><Heading size="md">{club.name}</Heading><Text color="fg.muted">{club.selectedWork.title} · {club.selectedWork.author}</Text>{club.description && <Text mt={2}>{club.description}</Text>}</Card.Body></Link></Card.Root>)}
    </Stack>;
}

function CreateClubForm() {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [selectedBook, setSelectedBook] = useState<BookModel | null>(null);
    const [visibility, setVisibility] = useState<"private" | "instance_visible">("instance_visible");
    const [create, state] = useCreateBookClubMutation();
    if (!open) return <Button alignSelf="start" onClick={() => setOpen(true)}>Create book club</Button>;

    const close = () => {
        setOpen(false);
        setName("");
        setDescription("");
        setSelectedBook(null);
    };
    return <Card.Root><Card.Body as="form" onSubmit={async (event) => {
        event.preventDefault();
        if (!name.trim() || !selectedBook) return;
        try {
            await create({
                name: name.trim(),
                description: description.trim() || undefined,
                visibility,
                selectedWork: {
                    title: selectedBook.title,
                    author: selectedBook.author,
                    isbn: selectedBook.isbn,
                    series: selectedBook.series,
                    seriesPosition: selectedBook.seriesPosition,
                },
            }).unwrap();
            close();
        } catch { /* mutation state surfaces the error */ }
    }}><Stack gap={3}>
        <Heading size="md">Create a book club</Heading>
        <label>Club name<Input value={name} maxLength={120} onChange={(event) => setName(event.target.value)}/></label>
        <label htmlFor="create-description">Description (optional)</label>
        <Textarea id="create-description" value={description} maxLength={3000} onChange={(event) => setDescription(event.target.value)}/>
        <OwnedLibraryBookSelect id="club-work" label="Selected work" selectedBookId={selectedBook?.id} onSelect={setSelectedBook}/>
        <Select.Root collection={visibilityCollection} value={[visibility]} onValueChange={(details) => setVisibility(details.value[0] as typeof visibility)}>
            <Select.HiddenSelect/>
            <Select.Label>Visibility</Select.Label>
            <Select.Control><Select.Trigger><Select.ValueText/></Select.Trigger><Select.IndicatorGroup><Select.Indicator/></Select.IndicatorGroup></Select.Control>
            <Portal><Select.Positioner><Select.Content>{visibilityCollection.items.map((item) => <Select.Item item={item} key={item.value}><Select.ItemText>{item.label}</Select.ItemText><Select.ItemIndicator/></Select.Item>)}</Select.Content></Select.Positioner></Portal>
        </Select.Root>
        <HStack><Button type="submit" loading={state.isLoading} disabled={!name.trim() || !selectedBook}>Create club</Button><Button type="button" variant="ghost" onClick={close}>Cancel</Button></HStack>
        {state.error && <Text role="alert" color="fg.error">Could not create the club. Check the fields and try again.</Text>}
    </Stack></Card.Body></Card.Root>;
}
