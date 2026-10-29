import {useState} from "react";
import {Button, Flex, Heading, Input, Stack, Text} from "@chakra-ui/react";
import {useNavigate} from "react-router";
import {useDebounce} from "@uidotdev/usehooks";
import {
    type PeopleResult, useCancelClubInvitationMutation, useGetClubInvitationsQuery,
    useGetFriendsQuery, useGetOrganizerInvitationsQuery, useInviteToClubMutation,
    useRespondToClubInvitationMutation, useSearchPeopleQuery,
} from "@/entities/social/api";
import {EmptyState, ErrorState, LoadingState, PageSection} from "@/shared/ui/EditorialUI";
import {ActionButton, PersonRow, socialError} from "./SocialUI";

export function ClubInvitations() {
    const query = useGetClubInvitationsQuery(undefined, {refetchOnFocus: true, refetchOnReconnect: true});
    const [respond] = useRespondToClubInvitationMutation();
    const navigate = useNavigate();
    if (query.isLoading) return <LoadingState label="Loading invitations..."/>;
    if (query.error || !query.data) return <ErrorState onRetry={query.refetch}>Your club invitations couldn't be loaded.</ErrorState>;
    if (!query.data.length) return <EmptyState title="No invitations waiting">When someone invites you to a club, you can decide here. Dismissing a notification never dismisses an invitation.</EmptyState>;
    return <Stack gap={4}>{query.data.map(invitation => {
        const pending = invitation.status === "pending" && new Date(invitation.expiresAt).getTime() > Date.now();
        return <Stack key={invitation.id} gap={4} borderWidth="1px" borderRadius="xl" p={{base: 5, md: 6}} bg="bg.panel">
            <Stack gap={2}>
                <Text fontSize="sm" color="fg.muted">{invitation.inviterName} invited you to</Text>
                <Heading size="xl" overflowWrap="anywhere">{invitation.clubName}</Heading>
                <Text fontWeight="medium">{invitation.bookTitle}</Text><Text color="fg.muted">by {invitation.bookAuthor}</Text>
                <Text fontSize="sm" color="fg.muted">{pending ? `Respond by ${new Date(invitation.expiresAt).toLocaleDateString()}.` : "This invitation is no longer available."}</Text>
            </Stack>
            {pending && <Flex gap={2} wrap="wrap">
                <ActionButton variant="solid" run={async () => {
                    await respond({invitationId: invitation.id, action: "accept"}).unwrap();
                    navigate(`/book-clubs/${encodeURIComponent(invitation.clubId)}`);
                }}>Accept invitation</ActionButton>
                <ActionButton run={() => respond({invitationId: invitation.id, action: "decline"}).unwrap()}>Decline</ActionButton>
            </Flex>}
            <Text color="fg.muted" fontSize="sm">Club reading-plan progress is visible to all members. Your library and private reading positions stay private; you'll choose your reading copy separately.</Text>
        </Stack>;
    })}</Stack>;
}

export function InvitePeople({clubId, memberIds}: {clubId: string; memberIds: string[]}) {
    const [text, setText] = useState("");
    const [selected, setSelected] = useState<PeopleResult | null>(null);
    const [sent, setSent] = useState("");
    const [error, setError] = useState("");
    const [invite, sending] = useInviteToClubMutation();
    const invitations = useGetOrganizerInvitationsQuery(clubId);
    const friends = useGetFriendsQuery();
    const [cancel] = useCancelClubInvitationMutation();
    const debounced = useDebounce(text.trim(), 300);
    const ready = debounced.length >= 2 && debounced === text.trim();
    const people = useSearchPeopleQuery(debounced, {skip: !ready});
    const excluded = new Set([...memberIds, ...(invitations.data ?? []).filter(row => row.status === "pending").map(row => row.userId)]);
    const candidates = people.currentData?.filter(person => !excluded.has(person.id)) ?? [];
    return <Stack gap={7} borderTopWidth="1px" pt={5}>
        <PageSection title="Invite someone" description="Invite an existing account or choose a friend. They'll decide whether to join; nothing is shared before they accept.">
            <Stack as="form" gap={3} onSubmit={async e => {
                e.preventDefault();
                if (!selected || sending.isLoading || invitations.error) return;
                setError(""); setSent("");
                try {
                    await invite({clubId, userId: selected.id}).unwrap();
                    setSent(`Invitation sent to ${selected.name}.`); setSelected(null); setText("");
                } catch (error) {setError(socialError(error));}
            }}>
                <Stack gap={2}><label htmlFor="invite-person-search">Name or exact email</label>
                    <Input id="invite-person-search" value={text} type="search" autoComplete="off" minH="44px" maxLength={200}
                        placeholder="Find someone you know" disabled={sending.isLoading}
                        onChange={e => {setText(e.target.value); setSelected(null); setError(""); setSent("");}}/></Stack>
                {selected ? <Text fontWeight="medium">Selected: {selected.name}</Text> : ready ? people.isFetching ? <LoadingState label="Finding people..."/>
                    : people.error ? <ErrorState onRetry={people.refetch}>People couldn't be searched.</ErrorState>
                        : <Stack gap={1} maxH="240px" overflowY="auto">{candidates.length ? candidates.map(person => <Button key={person.id}
                            variant="ghost" justifyContent="start" minH="44px" h="auto" whiteSpace="normal" onClick={() => setSelected(person)}>{person.name}</Button>)
                            : <Text color="fg.muted" fontSize="sm">No new matching people. Try a different name or complete email.</Text>}</Stack>
                    : <Text color="fg.muted" fontSize="sm">Type at least 2 characters. Only display names are shown.</Text>}
                {!selected && !text && <Stack gap={2}>
                    {friends.error ? <ErrorState onRetry={friends.refetch}>Friend shortcuts couldn't be loaded. You can still search above.</ErrorState>
                        : friends.data?.filter(person => !excluded.has(person.userId)).length ? <><Text fontWeight="medium" fontSize="sm">Or choose a friend</Text>
                            <Flex gap={2} wrap="wrap">{friends.data.filter(person => !excluded.has(person.userId)).map(person =>
                                <Button key={person.userId} variant="outline" minH="44px" h="auto" whiteSpace="normal"
                                    onClick={() => setSelected({id: person.userId, name: person.name})}>{person.name}</Button>)}</Flex></> : null}
                </Stack>}
                <Button type="submit" colorPalette="orange" alignSelf="start" minH="44px" loading={sending.isLoading}
                    disabled={!selected || invitations.isLoading || !!invitations.error}>Send invitation</Button>
                {sent && <Text role="status" fontSize="sm" color="fg.muted">{sent}</Text>}
                {error && <Text role="alert" color="fg.error">{error}</Text>}
            </Stack>
        </PageSection>
        <PageSection title="Pending invitations" description="Invitations expire after 30 days. Declined or canceled invitations have a 24-hour resend wait.">
            {invitations.isLoading ? <LoadingState label="Loading pending invitations..."/> : invitations.error || !invitations.data ? <ErrorState onRetry={invitations.refetch}>Pending invitations couldn't be loaded.</ErrorState>
                : !invitations.data.length ? <Text color="fg.muted">No pending invitations.</Text>
                    : <Stack gap={0}>{invitations.data.map(invitation => <PersonRow key={invitation.id} name={invitation.name}
                        description={`Expires ${new Date(invitation.expiresAt).toLocaleDateString()}`}>
                        <ActionButton run={() => cancel({clubId, invitationId: invitation.id}).unwrap()}>Cancel invitation</ActionButton>
                    </PersonRow>)}</Stack>}
        </PageSection>
    </Stack>;
}
