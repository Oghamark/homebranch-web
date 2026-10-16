import {useState} from "react";
import {Button, Flex, Input, Stack, Text} from "@chakra-ui/react";
import {Link, useSearchParams} from "react-router";
import {useDebounce} from "@uidotdev/usehooks";
import {
    type Person, useBlockPersonMutation, useGetFriendRequestsQuery, useGetFriendsQuery,
    useRemoveFriendMutation, useRespondToFriendRequestMutation, useSearchPeopleQuery, useSendFriendRequestMutation,
} from "@/entities/social/api";
import {ConfirmAction, EmptyState, ErrorState, LoadingState, PageHeader, PageSection} from "@/shared/ui/EditorialUI";
import {ActionButton, PersonRow} from "@/features/social/SocialUI";

export function BlockPerson({person}: {person: Person}) {
    const [block] = useBlockPersonMutation();
    return <ConfirmAction title={`Block ${person.name}?`} actionLabel="Block" destructive
        description="This ends your friendship and cancels pending requests and invitations between you. You will still see each other in shared clubs."
        onConfirm={() => block(person.userId).unwrap()}/>;
}

export function FriendsPage() {
    const [params, setParams] = useSearchParams();
    const requested = params.get("view");
    const view = requested === "requests" || requested === "find" ? requested : "friends";
    return <Stack maxW="900px" mx="auto" gap={7} py={{base: 4, md: 7}}>
        <PageHeader title="Good books, familiar faces." description="Keep in touch with people on your Homebranch. Your friends list is private."
            actions={<Button asChild variant="outline" minH="44px"><Link to="/settings?section=privacy">Request settings</Link></Button>}/>
        <Flex as="nav" aria-label="Friends views" gap={2} wrap="wrap">
            {[["friends", "Friends"], ["requests", "Requests"], ["find", "Find people"]].map(([key, label]) =>
                <Button key={key} minH="44px" variant={key === view ? "solid" : "ghost"} colorPalette={key === view ? "orange" : undefined}
                    aria-current={key === view ? "page" : undefined} onClick={() => setParams(key === "friends" ? {} : {view: key})}>{label}</Button>)}
        </Flex>
        {view === "friends" ? <FriendList/> : view === "requests" ? <FriendRequests/> : <FindPeople/>}
        <Text fontSize="sm" color="fg.muted">Friendship never shares your library, reading history, or private club memberships.</Text>
    </Stack>;
}

function FriendList() {
    const query = useGetFriendsQuery(undefined, {refetchOnFocus: true, refetchOnReconnect: true});
    const [remove] = useRemoveFriendMutation();
    if (query.isLoading) return <LoadingState label="Loading your friends..."/>;
    if (query.error || !query.data) return <ErrorState onRetry={query.refetch}>Your friends couldn't be loaded.</ErrorState>;
    if (!query.data.length) return <EmptyState title="Make a little room for friends"
        action={<Button asChild minH="44px" colorPalette="orange"><Link to="/friends?view=find">Find people</Link></Button>}>
        Send a request to someone you know. They'll decide whether to connect.
    </EmptyState>;
    return <PageSection title="Your friends">
        <Stack gap={0}>{query.data.map(person => <PersonRow key={person.userId} name={person.name}>
            <ConfirmAction title={`Remove ${person.name} as a friend?`} description="You can send another request later. Neither person's library or existing club membership will change."
                actionLabel="Remove friend" onConfirm={() => remove(person.userId).unwrap()}/>
            <BlockPerson person={person}/>
        </PersonRow>)}</Stack>
    </PageSection>;
}

function FriendRequests() {
    const query = useGetFriendRequestsQuery(undefined, {refetchOnFocus: true, refetchOnReconnect: true});
    const [respond] = useRespondToFriendRequestMutation();
    if (query.isLoading) return <LoadingState label="Loading requests..."/>;
    if (query.error || !query.data) return <ErrorState onRetry={query.refetch}>Your friend requests couldn't be loaded.</ErrorState>;
    const {incoming, outgoing} = query.data;
    return <Stack gap={8}>
        <PageSection title="Received" description="A request is only a friendship when you accept it.">
            {incoming.length ? <Stack gap={0}>{incoming.map(request => <PersonRow key={request.id} name={request.name}>
                <ActionButton variant="solid" run={() => respond({requestId: request.id, action: "accept"}).unwrap()}>Accept</ActionButton>
                <ActionButton run={() => respond({requestId: request.id, action: "decline"}).unwrap()}>Decline</ActionButton>
                <BlockPerson person={request}/>
            </PersonRow>)}</Stack> : <EmptyState title="No requests to decide">New friend requests will appear here, even if you dismiss their notification.</EmptyState>}
        </PageSection>
        <PageSection title="Sent">
            {outgoing.length ? <Stack gap={0}>{outgoing.map(request => <PersonRow key={request.id} name={request.name} description="Waiting for their response">
                <ActionButton run={() => respond({requestId: request.id, action: "cancel"}).unwrap()}>Cancel request</ActionButton>
            </PersonRow>)}</Stack> : <EmptyState title="No pending sent requests">Requests you've sent will appear here until they're decided.</EmptyState>}
            <Text fontSize="sm" color="fg.muted">After a request is declined or canceled, wait 24 hours before sending another to the same person.</Text>
        </PageSection>
    </Stack>;
}

function FindPeople() {
    const [text, setText] = useState("");
    const debounced = useDebounce(text.trim(), 300);
    const ready = debounced.length >= 2 && debounced === text.trim();
    const people = useSearchPeopleQuery(debounced, {skip: !ready});
    const friends = useGetFriendsQuery();
    const requests = useGetFriendRequestsQuery();
    return <PageSection title="Find someone you know" description="Search by display name or enter their complete email address. Only names are shown.">
        <Stack gap={2}><label htmlFor="people-search">Name or exact email</label>
            <Input id="people-search" type="search" autoComplete="off" maxLength={200} minH="44px" value={text}
                placeholder="Who would you like to connect with?" onChange={e => setText(e.target.value)}/></Stack>
        {!ready ? <Text color="fg.muted">Type at least 2 characters to search.</Text> : people.isFetching ? <LoadingState label="Finding people..."/>
            : people.error ? <ErrorState onRetry={people.refetch}>People couldn't be searched. Please try again.</ErrorState>
                : friends.error || requests.error ? <ErrorState onRetry={() => {void friends.refetch(); void requests.refetch();}}>Your existing connections couldn't be checked.</ErrorState>
                    : !friends.data || !requests.data ? <LoadingState label="Checking your connections..."/>
                        : !people.currentData?.length ? <EmptyState title="No matching people">Try another name or their complete email address.</EmptyState>
                            : <Stack gap={0}>{people.currentData.map(person => {
                                const isFriend = friends.data.some(friend => friend.userId === person.id);
                                const incoming = requests.data.incoming.some(request => request.userId === person.id);
                                const outgoing = requests.data.outgoing.some(request => request.userId === person.id);
                                return <PersonRow key={person.id} name={person.name}>
                                    {isFriend ? <Text color="fg.muted">Already friends</Text> : incoming ? <Button asChild variant="outline" minH="44px"><Link to="/friends?view=requests">Respond to request</Link></Button>
                                        : outgoing ? <Text color="fg.muted">Request sent</Text> : <SendRequest userId={person.id}/>}
                                    <BlockPerson person={{userId: person.id, name: person.name}}/>
                                </PersonRow>;
                            })}</Stack>}
    </PageSection>;
}

function SendRequest({userId}: {userId: string}) {
    const [send] = useSendFriendRequestMutation();
    return <ActionButton variant="solid" run={() => send(userId).unwrap()}>Send friend request</ActionButton>;
}
