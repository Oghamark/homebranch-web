import type {ReactNode} from "react";
import {Badge, Box, Button, Flex, Heading, HStack, Stack, Text} from "@chakra-ui/react";
import {Link, NavLink, useNavigate} from "react-router";
import {LuArrowLeft, LuBookOpen, LuMessagesSquare, LuSettings2, LuListChecks} from "react-icons/lu";
import {type BookClub, useGetBookClubQuery, useJoinBookClubMutation, useRemoveBookClubMemberMutation} from "@/entities/bookClub";
import {BookJacket, clubPalette, ClubLoading, ConfirmAction, ErrorState} from "./ClubUI";

export function ClubShell({clubId, children}: {clubId: string; children: (club: BookClub) => ReactNode}) {
    const query = useGetBookClubQuery(clubId);
    const [join, joining] = useJoinBookClubMutation();
    const [leave] = useRemoveBookClubMemberMutation();
    const navigate = useNavigate();
    if (query.isLoading) return <ClubLoading/>;
    if (query.error || !query.data) return <Stack maxW="1000px" mx="auto" py={6} gap={4}>
        <Button asChild variant="ghost" alignSelf="start"><Link to="/book-clubs"><LuArrowLeft/> Book clubs</Link></Button>
        <ErrorState onRetry={query.refetch}>This club is unavailable. It may be private, no longer exist, or be temporarily offline.</ErrorState>
    </Stack>;
    const club = query.data;
    const role = club.currentMembershipRole;
    const manager = role === "owner" || role === "moderator";
    const archived = club.status === "archived";
    const base = `/book-clubs/${club.id}`;
    const links = [
        {to: base, label: "Home", icon: LuBookOpen, end: true},
        {to: `${base}/reading-plan`, label: "Reading plan", icon: LuListChecks},
        {to: `${base}/discussions`, label: "Discussions", icon: LuMessagesSquare},
        ...(manager ? [{to: `${base}/manage`, label: "Manage", icon: LuSettings2}] : []),
    ];
    return <Stack data-book-club css={clubPalette} gap={{base: 5, md: 7}} maxW="1000px" mx="auto" py={{base: 4, md: 7}} pb={12} minW={0}>
        <Flex align="center" justify="space-between" gap={3} wrap="wrap">
            <Button asChild variant="ghost" minH="44px"><Link to="/book-clubs"><LuArrowLeft/> Book clubs</Link></Button>
            {role && role !== "owner" && !archived && <ConfirmAction title={`Leave ${club.name}?`} description="You will lose access to club discussions and your club progress. Your library books and private reading history will not be deleted."
                actionLabel="Leave club" destructive onConfirm={async () => {
                    await leave({clubId, userId: sessionStorage.getItem("user_id") ?? ""}).unwrap();
                    navigate("/book-clubs");
                }}/>}
        </Flex>
        <Flex gap={{base: 4, md: 6}} align="center" p={{base: 5, md: 8}} borderRadius="2xl" borderWidth="1px"
            bg={{base: "orange.50", _dark: "orange.950/30"}} borderColor={{base: "orange.200", _dark: "orange.900"}}>
            <Box display={{base: "none", sm: "block"}}><BookJacket title={club.selectedWork.title} author={club.selectedWork.author}/></Box>
            <Stack gap={3} minW={0}>
                <HStack wrap="wrap"><Badge variant="subtle" colorPalette="orange">{archived ? "Archived club" : "Reading together"}</Badge>
                    {club.visibility === "private" && <Badge variant="outline">Private</Badge>}</HStack>
                <Heading as="h1" size={{base: "2xl", md: "3xl"}} fontFamily="Georgia, serif" lineHeight="short" overflowWrap="anywhere">{club.name}</Heading>
                <Box><Text fontWeight="semibold" fontSize={{base: "md", md: "lg"}}>{club.selectedWork.title}</Text><Text color="fg.muted">by {club.selectedWork.author}</Text></Box>
                {club.description && <Text color="fg.muted" whiteSpace="pre-wrap" overflowWrap="anywhere" lineClamp={{base: 2, md: 4}}>{club.description}</Text>}
            </Stack>
        </Flex>
        {archived && <Text role="status" p={4} bg="bg.muted" borderRadius="lg">This club is archived. You can still revisit the reading plan and conversations, but they can no longer be changed.</Text>}
        {role ? <>
            <Flex as="nav" aria-label="Club navigation" gap={1} wrap="wrap" borderBottomWidth="1px" pb={3}>
                {links.map(({to, label, icon: Icon, end}) => <Button key={to} asChild variant="ghost" minH="44px" px={{base: 3, md: 4}}
                    css={{"&[aria-current=page]": {background: "var(--chakra-colors-bg-emphasized)", fontWeight: "bold"}}}>
                    <NavLink to={to} end={end}><Box as="span" display={{base: "none", sm: "inline-flex"}}><Icon/></Box>{label}</NavLink>
                </Button>)}
            </Flex>
            {children(club)}
        </> : <Stack align="start" gap={4} p={{base: 5, md: 7}} borderWidth="1px" borderRadius="xl">
            <Heading size="xl" fontFamily="Georgia, serif">A good book is better together.</Heading>
            <Text color="fg.muted">Join to take part in conversations and follow the reading plan. You can choose your own reading copy later.</Text>
            <Text fontSize="sm" color="fg.muted">Open to people on this Homebranch. Joining does not give anyone access to your library.</Text>
            {!archived && club.visibility === "instance_visible" && <Button colorPalette="orange" minH="44px" loading={joining.isLoading} onClick={() => join(club.id)}>Join club</Button>}
            {joining.error && <ErrorState onRetry={() => join(club.id)}>We couldn't join this club. Please try again.</ErrorState>}
        </Stack>}
    </Stack>;
}
