import {useMemo, useState} from "react";
import {Badge, Box, Button, Card, Flex, Heading, HStack, Loader, Separator, Stack, Text, Textarea} from "@chakra-ui/react";
import {Link, useNavigate, useSearchParams} from "react-router";
import {LuArrowLeft, LuEye, LuLock, LuMessageCircle, LuPin, LuShield, LuSparkles} from "react-icons/lu";
import {
    type DiscussionReply,
    type DiscussionThread,
    type ModerationAction,
    useCreateDiscussionReplyMutation,
    useCreateDiscussionThreadMutation,
    useGetBookClubQuery,
    useGetDiscussionAuditQuery,
    useGetDiscussionRepliesQuery,
    useGetDiscussionThreadsQuery,
    useModerateDiscussionReplyMutation,
    useModerateDiscussionThreadMutation,
} from "@/entities/bookClub";
import TextField from "@/shared/ui/TextField";

interface DiscussionsPageProps {
    clubId: string;
}

const errorMessage = "This discussion space is unavailable.";

export function DiscussionsPage({clubId}: DiscussionsPageProps) {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const selectedThreadId = searchParams.get("thread");
    const currentUserId = sessionStorage.getItem("user_id");
    const [revealedThreadIds, setRevealedThreadIds] = useState<Set<string>>(new Set());
    const [revealedReplyIds, setRevealedReplyIds] = useState<Set<string>>(new Set());
    const {data: club, error: clubError, isLoading: clubLoading} = useGetBookClubQuery(clubId);
    const {data: threads = [], error: threadsError, isLoading: threadsLoading} = useGetDiscussionThreadsQuery({clubId, revealSpoilers: revealedThreadIds.size > 0});
    const selectedThread = threads.find((thread) => thread.id === selectedThreadId);
    const isOwner = club?.ownerUserId === currentUserId;

    const chooseThread = (threadId: string) => setSearchParams({thread: threadId});
    const revealThread = (threadId: string) => setRevealedThreadIds((ids) => new Set(ids).add(threadId));

    if (clubLoading || threadsLoading) return <Flex height="100%" align="center" justify="center"><Loader/></Flex>;
    if (clubError || threadsError || !club) {
        return <UnavailableDiscussions onBack={() => navigate("/book-clubs")}/>;
    }

    if (selectedThreadId && !selectedThread) {
        return <UnavailableDiscussions onBack={() => setSearchParams({})}/>;
    }

    if (selectedThread) {
        return <ThreadView
            clubId={clubId}
            thread={selectedThread}
            isModerator={isOwner}
            onBack={() => setSearchParams({})}
            threadRevealed={revealedThreadIds.has(selectedThread.id)}
            onRevealThread={() => revealThread(selectedThread.id)}
            revealedReplyIds={revealedReplyIds}
            onRevealReply={(replyId) => setRevealedReplyIds((ids) => new Set(ids).add(replyId))}
        />;
    }

    return (
        <Stack gap={5} maxW="960px" mx="auto">
            <Flex align="center" justify="space-between" gap={3} wrap="wrap">
                <Box>
                    <Heading size="xl">{club.name} discussions</Heading>
                    <Text color="fg.muted">{club.selectedWork.title} · {club.selectedWork.author}</Text>
                </Box>
                <Button variant="outline" asChild><Link to="/book-clubs"><LuArrowLeft/> All clubs</Link></Button>
            </Flex>
            <CreateThreadForm clubId={clubId} canCreatePrompt={isOwner}/>
            {isOwner && <AuditPanel clubId={clubId}/>}
            {threads.length === 0 ? (
                <Card.Root><Card.Body><Stack align="center" py={8}><LuMessageCircle size={28}/><Heading size="md">Start the conversation</Heading><Text color="fg.muted">No discussion threads have been posted yet.</Text></Stack></Card.Body></Card.Root>
            ) : (
                <Stack gap={3}>
                    {threads.map((thread) => (
                        <ThreadCard
                            key={thread.id}
                            thread={thread}
                            isModerator={isOwner}
                            onOpen={() => chooseThread(thread.id)}
                            revealed={revealedThreadIds.has(thread.id)}
                            onReveal={() => revealThread(thread.id)}
                        />
                    ))}
                </Stack>
            )}
        </Stack>
    );
}

function UnavailableDiscussions({onBack}: {onBack: () => void}) {
    return <Stack height="100%" align="center" justify="center" gap={3}><Heading size="lg">{errorMessage}</Heading><Text color="fg.muted">You may need to join the club before viewing its discussions.</Text><Button onClick={onBack}>Back to book clubs</Button></Stack>;
}

function ThreadCard({thread, isModerator, onOpen, revealed, onReveal}: {thread: DiscussionThread; isModerator: boolean; onOpen: () => void; revealed: boolean; onReveal: () => void}) {
    const [moderate, {isLoading}] = useModerateDiscussionThreadMutation();
    const bodyVisible = !thread.spoiler || revealed;
    const perform = async (action: ModerationAction) => {
        try { await moderate({clubId: thread.clubId, threadId: thread.id, action}).unwrap(); } catch { /* API state remains authoritative */ }
    };
    return <Card.Root variant="outline"><Card.Body><Stack gap={3}>
        <Flex justify="space-between" align="start" gap={3}>
            <Stack gap={1} minW={0}><HStack wrap="wrap">{thread.pinned && <Badge colorPalette="purple"><LuPin/> Pinned</Badge>}{thread.promptKind && <Badge colorPalette="blue"><LuSparkles/> Moderator prompt</Badge>}{thread.locked && <Badge colorPalette="orange"><LuLock/> Locked</Badge>}{thread.spoiler && <Badge colorPalette="red">Spoiler</Badge>}</HStack><Heading size="md">{thread.title}</Heading></Stack>
            <Button size="sm" onClick={onOpen}>Open</Button>
        </Flex>
        {bodyVisible ? <Text whiteSpace="pre-wrap">{thread.body}</Text> : <SpoilerReveal onReveal={onReveal}/>}
        {isModerator && <ModerationButtons loading={isLoading} locked={thread.locked} pinned={thread.pinned} onAction={perform}/>}
    </Stack></Card.Body></Card.Root>;
}

function ThreadView({clubId, thread, isModerator, onBack, threadRevealed, onRevealThread, revealedReplyIds, onRevealReply}: {clubId: string; thread: DiscussionThread; isModerator: boolean; onBack: () => void; threadRevealed: boolean; onRevealThread: () => void; revealedReplyIds: Set<string>; onRevealReply: (replyId: string) => void}) {
    const {data: replies = [], error, isLoading} = useGetDiscussionRepliesQuery({clubId, threadId: thread.id, revealSpoilers: revealedReplyIds.size > 0});
    if (isLoading) return <Flex justify="center" py={10}><Loader/></Flex>;
    if (error) return <UnavailableDiscussions onBack={onBack}/>;
    return <Stack gap={5} maxW="960px" mx="auto"><Button alignSelf="start" variant="ghost" onClick={onBack}><LuArrowLeft/> Back to threads</Button>
        <ThreadCard thread={thread} isModerator={isModerator} onOpen={() => undefined} revealed={!thread.spoiler || threadRevealed} onReveal={onRevealThread}/>
        <Heading size="md">Replies</Heading>
        {replies.length === 0 ? <Text color="fg.muted">No replies yet.</Text> : <Stack gap={3}>{replies.map((reply) => <ReplyCard key={reply.id} reply={reply} isModerator={isModerator} revealed={revealedReplyIds.has(reply.id)} onReveal={() => onRevealReply(reply.id)}/>)}</Stack>}
        {!thread.locked ? <CreateReplyForm clubId={clubId} threadId={thread.id}/> : <Text color="fg.muted">This thread is locked and no longer accepts replies.</Text>}
    </Stack>;
}

function ReplyCard({reply, isModerator, revealed, onReveal}: {reply: DiscussionReply; isModerator: boolean; revealed: boolean; onReveal: () => void}) {
    const [moderate, {isLoading}] = useModerateDiscussionReplyMutation();
    const perform = async (action: "hide" | "restore" | "delete") => { try { await moderate({clubId: reply.clubId, replyId: reply.id, action}).unwrap(); } catch { /* API state remains authoritative */ } };
    return <Card.Root variant="outline"><Card.Body><Stack gap={3}><HStack><Badge variant="outline">Reply</Badge>{reply.spoiler && <Badge colorPalette="red">Spoiler</Badge>}</HStack>{!reply.spoiler || revealed ? <Text whiteSpace="pre-wrap">{reply.body}</Text> : <SpoilerReveal onReveal={onReveal}/>} {isModerator && <HStack><Button size="xs" variant="outline" loading={isLoading} onClick={() => perform("hide")}>Hide</Button><Button size="xs" variant="outline" loading={isLoading} onClick={() => perform("delete")}>Delete</Button></HStack>}</Stack></Card.Body></Card.Root>;
}

function SpoilerReveal({onReveal}: {onReveal: () => void}) { return <Box p={3} borderRadius="md" bg="bg.muted"><HStack justify="space-between" gap={3}><Text color="fg.muted">Spoiler content is hidden.</Text><Button size="sm" onClick={onReveal}><LuEye/> Reveal</Button></HStack></Box>; }

function ModerationButtons({loading, locked, pinned, onAction}: {loading: boolean; locked: boolean; pinned: boolean; onAction: (action: ModerationAction) => void}) { return <><Separator/><HStack wrap="wrap"><Badge colorPalette="purple"><LuShield/> Moderator controls</Badge><Button size="xs" variant="outline" loading={loading} onClick={() => onAction(locked ? "unlock" : "lock")}>{locked ? "Unlock" : "Lock"}</Button><Button size="xs" variant="outline" loading={loading} onClick={() => onAction(pinned ? "unpin" : "pin")}>{pinned ? "Unpin" : "Pin"}</Button><Button size="xs" variant="outline" loading={loading} onClick={() => onAction("hide")}>Hide</Button><Button size="xs" variant="outline" loading={loading} onClick={() => onAction("delete")}>Delete</Button></HStack></>; }

function CreateThreadForm({clubId, canCreatePrompt}: {clubId: string; canCreatePrompt: boolean}) {
    const [title, setTitle] = useState(""); const [body, setBody] = useState(""); const [spoiler, setSpoiler] = useState(false); const [promptKind, setPromptKind] = useState(false); const [submitted, setSubmitted] = useState(false);
    const [create, {isLoading, error}] = useCreateDiscussionThreadMutation();
    const titleError = submitted && (title.trim().length < 1 || title.trim().length > 160); const bodyError = submitted && (body.trim().length < 1 || body.trim().length > 10000);
    const submit = async (event: React.FormEvent) => { event.preventDefault(); setSubmitted(true); if (titleError || bodyError || !title.trim() || !body.trim()) return; try { await create({clubId, title: title.trim(), body: body.trim(), spoiler, ...(canCreatePrompt ? {promptKind} : {})}).unwrap(); setTitle(""); setBody(""); setSpoiler(false); setPromptKind(false); setSubmitted(false); } catch { /* server validation is authoritative */ } };
    return <Card.Root><Card.Body as="form" onSubmit={submit}><Stack gap={3}><Heading size="md">New thread</Heading><TextField label="Title" value={title} maxLength={160} onChange={(e) => setTitle(e.target.value)} error={titleError} errorText="Enter a title of up to 160 characters."/><Box><Text mb={1} fontWeight="medium">Discussion</Text><Textarea value={body} maxLength={10000} onChange={(e) => setBody(e.target.value)} aria-invalid={bodyError} aria-describedby={bodyError ? "thread-body-error" : undefined}/>{bodyError && <Text id="thread-body-error" color="fg.error" fontSize="sm">Enter a discussion of up to 10,000 characters.</Text>}</Box><HStack wrap="wrap"><label><input type="checkbox" checked={spoiler} onChange={(e) => setSpoiler(e.target.checked)}/> Mark as spoiler</label>{canCreatePrompt && <label><input type="checkbox" checked={promptKind} onChange={(e) => setPromptKind(e.target.checked)}/> Moderator prompt</label>}</HStack>{error && <Text color="fg.error">Unable to create this thread. Check your membership and try again.</Text>}<Button type="submit" alignSelf="start" loading={isLoading}>Post thread</Button></Stack></Card.Body></Card.Root>;
}

function CreateReplyForm({clubId, threadId}: {clubId: string; threadId: string}) { const [body, setBody] = useState(""); const [spoiler, setSpoiler] = useState(false); const [submitted, setSubmitted] = useState(false); const [create, {isLoading, error}] = useCreateDiscussionReplyMutation(); const bodyError = submitted && (body.trim().length < 1 || body.trim().length > 10000); const submit = async (event: React.FormEvent) => { event.preventDefault(); setSubmitted(true); if (bodyError || !body.trim()) return; try { await create({clubId, threadId, body: body.trim(), spoiler}).unwrap(); setBody(""); setSpoiler(false); setSubmitted(false); } catch { /* server validation is authoritative */ } }; return <Card.Root><Card.Body as="form" onSubmit={submit}><Stack gap={3}><Heading size="md">Reply</Heading><Textarea value={body} maxLength={10000} onChange={(e) => setBody(e.target.value)} aria-label="Reply" aria-invalid={bodyError}/>{bodyError && <Text color="fg.error" fontSize="sm">Enter a reply of up to 10,000 characters.</Text>}<label><input type="checkbox" checked={spoiler} onChange={(e) => setSpoiler(e.target.checked)}/> Mark as spoiler</label>{error && <Text color="fg.error">Unable to post this reply. Check that the thread is still open.</Text>}<Button type="submit" alignSelf="start" loading={isLoading}>Post reply</Button></Stack></Card.Body></Card.Root>; }

function AuditPanel({clubId}: {clubId: string}) { const [open, setOpen] = useState(false); const {data = [], isLoading, error} = useGetDiscussionAuditQuery(clubId, {skip: !open}); const entries = useMemo(() => data, [data]); return <Card.Root variant="subtle"><Card.Body><Stack gap={3}><HStack justify="space-between"><HStack><LuShield/><Heading size="sm">Owner moderation audit</Heading></HStack><Button size="sm" variant="outline" onClick={() => setOpen(!open)}>{open ? "Hide" : "View audit"}</Button></HStack>{open && (isLoading ? <Loader/> : error ? <Text color="fg.error">Audit records could not be loaded.</Text> : entries.length === 0 ? <Text color="fg.muted">No moderation actions recorded.</Text> : <Stack gap={1}>{entries.map((entry) => <Text key={entry.id} fontSize="sm">{entry.action} {entry.targetType} · {new Date(entry.createdAt).toLocaleString()}</Text>)}</Stack>)}</Stack></Card.Body></Card.Root>; }
