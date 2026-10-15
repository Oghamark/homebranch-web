import {useEffect, useRef, useState} from "react";
import {Button, Flex, Heading, HStack, Input, NativeSelect, Stack, Text, Textarea} from "@chakra-ui/react";
import {Link, useNavigate} from "react-router";
import {useDebounce} from "@uidotdev/usehooks";
import {LuArrowRight, LuUserPlus} from "react-icons/lu";
import {type BookClub, type BookClubVisibility, useAddBookClubMemberMutation, useArchiveBookClubMutation, useDeleteBookClubMutation, useGetBookClubMembersQuery, useRemoveBookClubMemberMutation, useTransferBookClubOwnershipMutation, useUpdateBookClubMemberMutation, useUpdateBookClubMutation} from "@/entities/bookClub";
import {type UserSearchResult, useSearchUsersQuery} from "@/entities/user";
import {ClubShell} from "./ClubShell";
import {ClubLoading, ConfirmAction, EmptyState, ErrorState} from "./ClubUI";
import {MemberName, MemberNamesProvider} from "./MemberName";
import {ModerationPanel} from "./ModerationPanel";

export function BookClubManagePage({clubId}: {clubId: string}) {
    return <ClubShell clubId={clubId}>{club => <ManageClub club={club}/>}</ClubShell>;
}

function ManageClub({club}: {club: BookClub}) {
    const role = club.currentMembershipRole;
    if (role !== "owner" && role !== "moderator") return <EmptyState title="This space is for club organizers">You can follow the reading plan and join discussions from the club navigation.</EmptyState>;
    if (club.status === "archived") return <Stack gap={5}><Heading size="xl" fontFamily="Georgia, serif">Club records</Heading><ModerationPanel clubId={club.id} owner={role === "owner"} readOnly/></Stack>;
    return <Stack gap={8}>
        <Stack gap={2}><Heading as="h2" size="2xl" fontFamily="Georgia, serif">A welcoming space starts here.</Heading><Text color="fg.muted">Take care of the details, then get back to the book.</Text></Stack>
        {role === "owner" && <ClubDetails club={club}/>}
        <Flex justify="space-between" align="center" gap={4} wrap="wrap" borderWidth="1px" p={5} borderRadius="xl"><Stack gap={1}><Heading size="md">Reading plan</Heading><Text fontSize="sm" color="fg.muted">Set the pace with chapters, parts, and checkpoints.</Text></Stack>
            <Button asChild variant="outline" minH="44px"><Link to={`/book-clubs/${club.id}/reading-plan`}>Plan your read <LuArrowRight/></Link></Button></Flex>
        <PeoplePanel club={club} owner={role === "owner"}/>
        <ModerationPanel clubId={club.id} owner={role === "owner"}/>
        {role === "owner" && <AdvancedSettings club={club}/>}
    </Stack>;
}

function ClubDetails({club}: {club: BookClub}) {
    const [name, setName] = useState(club.name);
    const [description, setDescription] = useState(club.description ?? "");
    const [visibility, setVisibility] = useState<BookClubVisibility>(club.visibility);
    const dirty = useRef(false);
    const [saved, setSaved] = useState(false);
    const [save, state] = useUpdateBookClubMutation();
    useEffect(() => {
        if (!dirty.current) {setName(club.name); setDescription(club.description ?? ""); setVisibility(club.visibility);}
    }, [club.name, club.description, club.visibility]);
    const edit = () => {dirty.current = true; setSaved(false);};
    return <Stack as="form" gap={4} p={{base: 5, md: 6}} borderWidth="1px" borderRadius="xl" onSubmit={async e => {
        e.preventDefault();
        if (!name.trim()) return;
        try {await save({clubId: club.id, name: name.trim(), description: description.trim() || null, visibility}).unwrap(); dirty.current = false; setSaved(true);}
        catch { /* The mutation error is displayed below. */ }
    }}><Heading size="lg">Club details</Heading>
        <Stack gap={2}><label htmlFor="settings-name">Club name</label><Input id="settings-name" value={name} required maxLength={120} disabled={state.isLoading} onChange={e => {edit(); setName(e.target.value);}}/></Stack>
        <Stack gap={2}><label htmlFor="settings-description">About your club</label><Textarea id="settings-description" value={description} maxLength={3000} disabled={state.isLoading} onChange={e => {edit(); setDescription(e.target.value);}}/></Stack>
        <Stack gap={2}><label htmlFor="settings-visibility">Who can find and join this club?</label><NativeSelect.Root disabled={state.isLoading}><NativeSelect.Field id="settings-visibility" value={visibility} onChange={e => {
            edit(); setVisibility(e.target.value === "private" ? "private" : "instance_visible");
        }}><option value="instance_visible">Open to people on this Homebranch</option><option value="private">Private: only people you add</option></NativeSelect.Field><NativeSelect.Indicator/></NativeSelect.Root>
            <Text color="fg.muted" fontSize="sm">Open clubs appear in Discover and can be joined by anyone on this Homebranch. Private clubs are only visible to their members. Changing this never shares library books.</Text>
        </Stack>
        <Button type="submit" minH="44px" alignSelf="start" colorPalette="orange" loading={state.isLoading} disabled={!name.trim()}>Save club details</Button>
        {saved && <Text role="status" color="fg.muted" fontSize="sm">Club details saved.</Text>}
        {state.error && <Text role="alert" color="fg.error">Your club details couldn't be saved. Your changes are still here; please try again.</Text>}
    </Stack>;
}

function PeoplePanel({club, owner}: {club: BookClub; owner: boolean}) {
    const members = useGetBookClubMembersQuery(club.id);
    const [add, adding] = useAddBookClubMemberMutation();
    const [remove] = useRemoveBookClubMemberMutation();
    const [changeRole, changing] = useUpdateBookClubMemberMutation();
    const [transfer] = useTransferBookClubOwnershipMutation();
    const [query, setQuery] = useState("");
    const [selected, setSelected] = useState<UserSearchResult | null>(null);
    const debounced = useDebounce(query.trim(), 250);
    const canSearch = debounced.length >= 2;
    const users = useSearchUsersQuery(debounced, {skip: !canSearch});
    const [added, setAdded] = useState(false);
    const candidates = (users.data ?? []).filter(user => !members.data?.some(member => member.userId === user.id));
    return <Stack gap={5} p={{base: 5, md: 6}} borderWidth="1px" borderRadius="xl">
        <Stack gap={1}><Heading size="lg">People</Heading><Text color="fg.muted" fontSize="sm">Only club organizers can browse this list. Membership never gives access to someone's library.</Text></Stack>
        {members.isLoading ? <ClubLoading/> : members.error ? <ErrorState onRetry={members.refetch}>The member list couldn't be loaded.</ErrorState>
            : <MemberNamesProvider userIds={(members.data ?? []).map(member => member.userId)}>
                <Stack gap={3}>{members.data?.map(member => <Flex key={member.userId} justify="space-between" align="center" wrap="wrap" gap={3} borderBottomWidth="1px" pb={3}>
                    <Stack gap={0}><Text fontWeight="medium"><MemberName userId={member.userId}/></Text>
                        <Text color="fg.muted" fontSize="sm">{member.role === "owner" ? "Club owner" : member.role === "moderator" ? "Moderator" : "Member"}</Text></Stack>
                    <HStack wrap="wrap">
                        {owner && member.role !== "owner" && <Button variant="ghost" minH="44px" loading={changing.isLoading} onClick={() => changeRole({clubId: club.id, userId: member.userId, role: member.role === "moderator" ? "member" : "moderator"})}>
                            {member.role === "moderator" ? "Make member" : "Make moderator"}
                        </Button>}
                        {owner && member.role !== "owner" && <ConfirmAction title={<>Make <MemberName userId={member.userId}/> the club owner?</>} description={`They will become the owner of ${club.name}, with control over settings, membership, and deletion. You will become an ordinary member.`} actionLabel="Transfer ownership"
                            onConfirm={() => transfer({clubId: club.id, newOwnerUserId: member.userId}).unwrap()}/>}
                        {(owner && member.role !== "owner" || !owner && member.role === "member") && <ConfirmAction title={<>Remove <MemberName userId={member.userId}/> from {club.name}?</>} description={`They will lose access to ${club.name} and their club progress. Their library and private reading history are unaffected.`} actionLabel="Remove member" destructive
                            onConfirm={() => remove({clubId: club.id, userId: member.userId}).unwrap()}/>}
                    </HStack>
                </Flex>)}</Stack>
            </MemberNamesProvider>}
        {changing.error && <Text role="alert" color="fg.error">The role couldn't be changed. Please try again.</Text>}
        <Stack as="form" gap={3} borderTopWidth="1px" pt={5} onSubmit={async e => {
            e.preventDefault();
            if (!selected) return;
            setAdded(false);
            try {await add({clubId: club.id, userId: selected.id}).unwrap(); setQuery(""); setSelected(null); setAdded(true);}
            catch { /* The mutation error is displayed below. */ }
        }}>
            <Heading size="md"><HStack><LuUserPlus/> Add someone to the club</HStack></Heading>
            <Text color="fg.muted" fontSize="sm">Search for an existing account on this Homebranch. They will be added directly; no invitation email is sent.</Text>
            <label htmlFor="member-search">Name or email</label><Input id="member-search" value={query} minH="44px" disabled={adding.isLoading || !!members.error || members.isLoading} placeholder="Find someone you know" onChange={e => {setQuery(e.target.value); setSelected(null); setAdded(false);}}/>
            {selected ? <Text fontWeight="medium">Selected: {selected.name} ({selected.email})</Text>
                : canSearch && debounced === query.trim() && (users.isFetching ? <Text role="status" color="fg.muted">Searching...</Text>
                    : users.error ? <ErrorState onRetry={users.refetch}>People couldn't be searched.</ErrorState>
                        : <Stack gap={1} maxH="240px" overflowY="auto">{candidates.length ? candidates.map(user =>
                            <Button key={user.id} variant="ghost" minH="56px" h="auto" justifyContent="start" textAlign="start" whiteSpace="normal" onClick={() => setSelected(user)}>
                                <Stack gap={0}><Text>{user.name}</Text><Text color="fg.muted" fontSize="sm">{user.email}</Text></Stack>
                            </Button>) : <Text color="fg.muted" fontSize="sm">No new matching people. Try a different name or email.</Text>}</Stack>)}
            {!canSearch && <Text fontSize="sm" color="fg.muted">Type at least 2 characters to search.</Text>}
            <Button type="submit" alignSelf="start" minH="44px" colorPalette="orange" disabled={!selected} loading={adding.isLoading}>Add to club</Button>
            {added && <Text role="status" fontSize="sm" color="fg.muted">Member added.</Text>}
            {adding.error && <Text role="alert" color="fg.error">This person couldn't be added. They may already be a member. Please try again.</Text>}
        </Stack>
    </Stack>;
}

function AdvancedSettings({club}: {club: BookClub}) {
    const [archive] = useArchiveBookClubMutation();
    const [remove] = useDeleteBookClubMutation();
    const navigate = useNavigate();
    return <details><summary style={{cursor: "pointer", paddingBlock: "14px", fontWeight: 600}}>Advanced club settings</summary>
        <Stack gap={5} borderWidth="1px" borderColor="border.error" borderRadius="xl" p={5} mt={3} align="start">
            <Heading size="md">When it's time to close this chapter</Heading>
            <Text color="fg.muted" fontSize="sm">To hand over the club or leave it yourself, transfer ownership to an existing member in People first.</Text>
            <ConfirmAction title={`Archive ${club.name}?`} description="The club will move to Archived. Members can revisit its reading plan and discussions, but no one can join or make changes. Archiving cannot currently be undone." actionLabel="Archive club"
                onConfirm={async () => {await archive(club.id).unwrap(); navigate(`/book-clubs/${club.id}`);}}/>
            <ConfirmAction title={`Permanently delete ${club.name}?`} description="This permanently removes the club, its discussions, reading plan, memberships, and club progress for everyone. It cannot be undone. Library books and private reading history are not deleted."
                actionLabel="Delete club permanently" destructive onConfirm={async () => {await remove(club.id).unwrap(); navigate("/book-clubs");}}/>
        </Stack>
    </details>;
}
