import {useState} from "react";
import {Badge, Box, Button, Card, Heading, HStack, Loader, Stack, Text} from "@chakra-ui/react";
import {
    type DiscussionRecoveryTarget,
    useGetDiscussionAuditQuery, useGetDiscussionRecoveryTargetsQuery,
    useModerateDiscussionReplyMutation, useModerateDiscussionThreadMutation,
} from "@/entities/bookClub";
import {ConfirmAction, EmptyState, ErrorState} from "./ClubUI";
import {MemberName, MemberNamesProvider} from "./MemberName";

export function ModerationPanel({clubId, owner, readOnly = false}: {clubId: string; owner: boolean; readOnly?: boolean}) {
    return <Stack gap={5}>
        <RecoveryPanel clubId={clubId} readOnly={readOnly}/>
        {owner && <AuditPanel clubId={clubId}/>}
    </Stack>;
}

function RecoveryPanel({clubId, readOnly}: {clubId: string; readOnly: boolean}) {
    const [open, setOpen] = useState(false);
    const {currentData: targets = [], isLoading, error, refetch} = useGetDiscussionRecoveryTargetsQuery(clubId, {skip: !open});
    const [restoreThread] = useModerateDiscussionThreadMutation();
    const [restoreReply] = useModerateDiscussionReplyMutation();
    const restore = (target: DiscussionRecoveryTarget) => target.type === "thread"
        ? restoreThread({clubId, threadId: target.id, action: "restore"}).unwrap()
        : restoreReply({clubId, replyId: target.id, action: "restore"}).unwrap();

    return <Card.Root variant="outline"><Card.Body><Stack gap={4}>
        <Heading as="h3" size="lg" fontFamily="Georgia, serif">Moderated conversations</Heading>
        <Text color="fg.muted">Review hidden or deleted posts. Post text and author details stay private in this view.</Text>
        {readOnly && <Text color="fg.muted">This club is archived. Moderated posts cannot be restored.</Text>}
        <Button minH="44px" variant="outline" alignSelf="start" onClick={() => setOpen(value => !value)} aria-expanded={open} aria-controls="moderated-posts">
            {open ? "Close recovery" : "Review moderated posts"}
        </Button>
        {open && <Stack id="moderated-posts" gap={3}>
            {isLoading ? <HStack role="status"><Loader/><Text>Loading moderated posts</Text></HStack>
                : error ? <ErrorState onRetry={() => void refetch()}>Moderated posts could not be loaded. Try again.</ErrorState>
                    : targets.length === 0 ? <EmptyState title="Nothing to restore">No moderated posts are available for recovery.</EmptyState>
                        : targets.map((target, index) => <Box key={`${target.type}:${target.id}`} borderWidth="1px" borderRadius="lg" p={4}>
                            <HStack justify="space-between" gap={3} wrap="wrap">
                                <Stack gap={2}>
                                    <Text fontWeight="medium">{target.type === "thread" ? "Discussion" : "Reply"} {index + 1}</Text>
                                    <HStack wrap="wrap">{target.hidden && <Badge>Hidden</Badge>}{target.deleted && <Badge>Deleted</Badge>}</HStack>
                                </Stack>
                                {!readOnly && <ConfirmAction title={`Restore this ${target.type === "thread" ? "discussion" : "reply"}?`}
                                    description="This post will be visible to club members again. Its content is not shown here."
                                    actionLabel="Restore post" onConfirm={() => restore(target)}/>}
                            </HStack>
                        </Box>)}
        </Stack>}
    </Stack></Card.Body></Card.Root>;
}

const actionLabels: Record<string, string> = {
    hide: "Hid", restore: "Restored", delete: "Deleted", pin: "Pinned",
    unpin: "Unpinned", lock: "Locked", unlock: "Unlocked",
};

function AuditPanel({clubId}: {clubId: string}) {
    const [open, setOpen] = useState(false);
    const {currentData: entries = [], isLoading, error, refetch} = useGetDiscussionAuditQuery(clubId, {skip: !open});
    return <Card.Root variant="outline"><Card.Body><Stack gap={4}>
        <Heading as="h3" size="lg" fontFamily="Georgia, serif">Moderation history</Heading>
        <Text color="fg.muted">An owner-only record of organizer actions. Discussion content is not included.</Text>
        <Button minH="44px" alignSelf="start" variant="outline" onClick={() => setOpen(value => !value)} aria-expanded={open} aria-controls="moderation-history">
            {open ? "Close history" : "View moderation history"}
        </Button>
        {open && <MemberNamesProvider userIds={entries.map(entry => entry.actorUserId)}>
            <Stack id="moderation-history" gap={3}>
                {isLoading ? <HStack role="status"><Loader/><Text>Loading moderation history</Text></HStack>
                    : error ? <ErrorState onRetry={() => void refetch()}>Moderation history could not be loaded. Try again.</ErrorState>
                        : entries.length === 0 ? <EmptyState title="No moderation actions yet"/>
                            : entries.map(entry => <Box key={entry.id} borderBottomWidth="1px" pb={3}>
                                <Text><MemberName userId={entry.actorUserId}/>{" · "}{actionLabels[entry.action] ?? "Updated"} a {entry.targetType === "thread" ? "discussion" : "reply"}</Text>
                                <Text color="fg.muted" fontSize="sm"><time dateTime={entry.createdAt}>{new Date(entry.createdAt).toLocaleString()}</time></Text>
                            </Box>)}
            </Stack>
        </MemberNamesProvider>}
    </Stack></Card.Body></Card.Root>;
}
