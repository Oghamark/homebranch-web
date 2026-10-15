import {Card, Flex, Heading, Loader, Stack, Text} from "@chakra-ui/react";
import {Link} from "react-router";
import {useGetBookClubsQuery} from "@/entities/bookClub";

export function BookClubsPage() {
    const {data: clubs = [], isLoading, error} = useGetBookClubsQuery();
    if (isLoading) return <Flex height="100%" align="center" justify="center"><Loader/></Flex>;
    if (error) return <Stack align="center" justify="center" height="100%"><Heading size="lg">Book clubs are unavailable.</Heading><Text color="fg.muted">Try again when the service is available.</Text></Stack>;
    return <Stack gap={5} maxW="960px" mx="auto"><Heading size="xl">Book clubs</Heading>{clubs.length === 0 ? <Card.Root><Card.Body><Text color="fg.muted">No book clubs are available to you.</Text></Card.Body></Card.Root> : clubs.map((club) => <Card.Root key={club.id} asChild><Link to={`/book-clubs/${club.id}/discussions`}><Card.Body><Heading size="md">{club.name}</Heading><Text color="fg.muted">{club.selectedWork.title} · {club.selectedWork.author}</Text>{club.description && <Text mt={2}>{club.description}</Text>}</Card.Body></Link></Card.Root>)}</Stack>;
}
