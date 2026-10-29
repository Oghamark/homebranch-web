import {useSearchParams, Link} from "react-router";
import {Badge, Box, Button, Flex, HStack, Stack, Text} from "@chakra-ui/react";
import {
    type SocialNotification, useDismissNotificationMutation, useGetNotificationsQuery,
    useMarkAllNotificationsReadMutation, useMarkNotificationReadMutation,
} from "@/entities/social/api";
import {EmptyState, ErrorState, LoadingState, PageHeader} from "@/shared/ui/EditorialUI";
import {ActionButton} from "@/features/social/SocialUI";
import {useVisibleRefresh} from "@/shared/hooks/useVisibleRefresh";

export function notificationCopy(item: SocialNotification): string {
    switch (item.kind) {
        case "friend_request": return `${item.actorName} sent you a friend request.`;
        case "friend_accepted": return `${item.actorName} accepted your friend request.`;
        case "club_invitation": return `${item.actorName} invited you to ${item.clubName}.`;
        case "club_invitation_accepted": return `${item.actorName} joined ${item.clubName}.`;
        case "club_discussion": return `A new discussion in ${item.clubName}.`;
        case "club_reply": return `A new reply in a conversation you've joined in ${item.clubName}.`;
        case "club_reading_plan": return `The reading plan changed in ${item.clubName}.`;
    }
}

export function notificationLink(item: SocialNotification): {to: string; label: string} {
    if (item.kind === "friend_request") return {to: "/friends?view=requests", label: "View requests"};
    if (item.kind === "friend_accepted") return {to: "/friends", label: "View friends"};
    if (item.kind === "club_invitation") return {to: "/book-clubs?view=invitations", label: "View invitations"};
    if (!item.clubId) return {to: "/book-clubs", label: "Book clubs"};
    const base = `/book-clubs/${encodeURIComponent(item.clubId)}`;
    if (item.kind === "club_reading_plan") return {to: `${base}/reading-plan`, label: "View reading plan"};
    if (item.kind === "club_discussion" || item.kind === "club_reply") return {to: `${base}/discussions${item.threadId ? `?thread=${encodeURIComponent(item.threadId)}` : ""}`, label: "View conversation"};
    return {to: base, label: "Visit club"};
}

export function NotificationsPage() {
    const [params, setParams] = useSearchParams();
    const number = Number(params.get("page") ?? 1);
    const page = Number.isSafeInteger(number) && number > 0 ? number : 1;
    const query = useGetNotificationsQuery(page, useVisibleRefresh());
    const [readAll] = useMarkAllNotificationsReadMutation();
    const data = query.currentData;
    return <Stack maxW="900px" mx="auto" py={{base: 4, md: 7}} gap={7}>
        <PageHeader title="A little news from your people." description="Invitations, friendships, and conversations worth returning to."
            actions={data && data.unreadCount > 0 ? <ActionButton run={() => readAll().unwrap()}>Mark all read</ActionButton> : undefined}/>
        <HStack gap={3} flexWrap="wrap"><Button asChild variant="outline" minH="44px"><Link to="/friends?view=requests">Friend requests</Link></Button>
            <Button asChild variant="outline" minH="44px"><Link to="/book-clubs?view=invitations">Club invitations</Link></Button></HStack>
        <Text fontSize="sm" color="fg.muted">Reading or dismissing a notification never accepts or declines a request.</Text>
        {query.isLoading || query.isFetching && !data ? <LoadingState label="Loading notifications..."/> : query.error || !data ? <ErrorState onRetry={query.refetch}>Your notifications couldn't be loaded.</ErrorState>
            : data.items.length ? <Stack gap={3}>{data.items.map(item => <NotificationRow key={item.id} item={item}/>)}</Stack>
                : <EmptyState title={page > 1 ? "No more notifications" : "You're all caught up"}>New invitations, friend requests, and club activity will appear here.</EmptyState>}
        {data && (page > 1 || page * data.limit < data.total) && <Flex align="center" justify="space-between" gap={3}>
            <Button variant="outline" minH="44px" disabled={page <= 1 || query.isFetching} onClick={() => setParams({page: String(page - 1)})}>Previous</Button>
            <Text color="fg.muted" fontSize="sm">Page {page}</Text>
            <Button variant="outline" minH="44px" disabled={page * data.limit >= data.total || query.isFetching} onClick={() => setParams({page: String(page + 1)})}>Next</Button>
        </Flex>}
    </Stack>;
}

function NotificationRow({item}: {item: SocialNotification}) {
    const [read] = useMarkNotificationReadMutation();
    const [dismiss] = useDismissNotificationMutation();
    const target = notificationLink(item);
    return <Box as="article" borderWidth="1px" borderRadius="xl" p={{base: 4, md: 5}} bg={item.readAt ? "bg.panel" : "bg.subtle"}>
        <Stack gap={3}>
            <Flex justify="space-between" align="start" gap={3}>
                <Text fontWeight={item.readAt ? "normal" : "semibold"} overflowWrap="anywhere">{notificationCopy(item)}</Text>
                {!item.readAt && <Badge colorPalette="orange">Unread</Badge>}
            </Flex>
            <Text fontSize="sm" color="fg.muted"><time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString()}</time></Text>
            <HStack flexWrap="wrap" align="start">
                <Button asChild variant="outline" minH="44px"><Link to={target.to}>{target.label}</Link></Button>
                {!item.readAt && <ActionButton variant="ghost" run={() => read(item.id).unwrap()}>Mark read</ActionButton>}
                <ActionButton variant="ghost" run={() => dismiss(item.id).unwrap()}>Dismiss</ActionButton>
            </HStack>
        </Stack>
    </Box>;
}
