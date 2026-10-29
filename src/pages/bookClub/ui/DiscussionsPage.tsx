import {useState, type FormEvent} from "react";
import {Badge, Box, Button, Card, Flex, Heading, HStack, Loader, Stack, Text, Textarea} from "@chakra-ui/react";
import {Link, useSearchParams} from "react-router";
import {LuArrowLeft, LuLock, LuMessageCircle, LuPin, LuPlus} from "react-icons/lu";
import {
    type BookClub, type DiscussionReply, type DiscussionThread, type ModerationAction,
    useCreateDiscussionReplyMutation, useCreateDiscussionThreadMutation, useDeleteDiscussionReplyMutation,
    useDeleteDiscussionThreadMutation, useGetDiscussionRepliesQuery, useGetDiscussionThreadsQuery,
    useLazyGetDiscussionReplyQuery, useLazyGetDiscussionThreadQuery, useModerateDiscussionReplyMutation,
    useModerateDiscussionThreadMutation, useUpdateDiscussionReplyMutation, useUpdateDiscussionThreadMutation,
} from "@/entities/bookClub";
import TextField from "@/shared/ui/TextField";
import {ClubShell} from "./ClubShell";
import {ConfirmAction, EmptyState, ErrorState} from "./ClubUI";
import {MemberName, MemberNamesProvider} from "./MemberName";

interface DiscussionsPageProps {clubId: string; archived?: boolean}

export function DiscussionsPage({clubId, archived}: DiscussionsPageProps) {
    return <ClubShell clubId={clubId}>{club => club.currentMembershipRole
        ? <DiscussionSpace key={club.id} club={club} archived={archived}/>
        : null}</ClubShell>;
}

function DiscussionSpace({club, archived}: {club: BookClub; archived?: boolean}) {
    const [params] = useSearchParams();
    const selectedId = params.get("thread");
    const [composing, setComposing] = useState(false);
    const {currentData, error, isLoading, refetch} = useGetDiscussionThreadsQuery({clubId: club.id});
    const threads = currentData ?? [];
    const readOnly = club.status === "archived" || !!archived;
    const moderator = club.currentMembershipRole === "owner" || club.currentMembershipRole === "moderator";
    const discussionUrl = `/book-clubs/${encodeURIComponent(club.id)}/discussions`;
    const sorted = [...threads].sort((a, b) => Number(b.pinned) - Number(a.pinned) || Date.parse(b.createdAt) - Date.parse(a.createdAt));

    if (isLoading) return <Loading label="Loading discussions"/>;
    if (error && !currentData) return <ErrorState onRetry={() => void refetch()}>Discussions could not be loaded. Check your connection and try again.</ErrorState>;
    const selected = threads.find(thread => thread.id === selectedId);
    return <MemberNamesProvider userIds={threads.map(thread => thread.authorUserId)}><Stack gap={4}>
        {error && <ErrorState onRetry={() => void refetch()}>Discussions could not be refreshed. Your draft is still here. Try again.</ErrorState>}
        {selectedId ? selected
            ? <ThreadView key={selected.id} clubId={club.id} thread={selected} moderator={moderator} readOnly={readOnly} discussionUrl={discussionUrl}/>
            : <Stack gap={4}><BackToDiscussions to={discussionUrl}/><EmptyState title="This discussion is unavailable">
                It may have been removed or may no longer be available to you.
            </EmptyState><Button alignSelf="start" variant="outline" onClick={() => void refetch()}>Check again</Button></Stack>
            : <Stack gap={6}>
                <Flex justify="space-between" align="center" gap={4} wrap="wrap">
                    <Box><Heading as="h2" size="xl" fontFamily="Georgia, serif">Around the book</Heading><Text color="fg.muted" mt={1}>Questions, discoveries, and thoughts worth sharing.</Text></Box>
                    {!readOnly && <Button minH="44px" colorPalette="orange" onClick={() => setComposing(value => !value)} aria-expanded={composing} aria-controls="new-discussion">
                        <LuPlus/>{composing ? "Close composer" : "Start a discussion"}
                    </Button>}
                </Flex>
                {!readOnly && <Box id="new-discussion" hidden={!composing}><CreateThreadForm clubId={club.id} moderator={moderator} onCreated={() => setComposing(false)}/></Box>}
                {threads.length === 0 ? <EmptyState title="The conversation starts here">
                    {readOnly ? "No discussions were posted in this club." : "Share a question or a passage that stayed with you. You do not need to choose a reading copy to join in."}
                </EmptyState> : <Stack gap={3}>{sorted.map(thread => <Card.Root key={thread.id} variant="outline" bg="bg.panel">
                    <Card.Body gap={3}>
                        <ThreadBadges thread={thread}/>
                        <Heading as="h3" size="lg" fontFamily="Georgia, serif" overflowWrap="anywhere">
                            <Link style={{display: "flex", alignItems: "center", minHeight: 44}} to={`${discussionUrl}?thread=${encodeURIComponent(thread.id)}`}>{thread.title}</Link>
                        </Heading>
                        <Attribution userId={thread.authorUserId} createdAt={thread.createdAt}/>
                        {thread.spoiler ? <Text fontSize="sm" color="fg.muted">Spoiler inside. Open the discussion to choose whether to reveal it.</Text>
                            : <Text color="fg.muted" lineClamp={3} whiteSpace="pre-wrap" overflowWrap="anywhere">{thread.body}</Text>}
                    </Card.Body>
                </Card.Root>)}</Stack>}
            </Stack>}
    </Stack></MemberNamesProvider>;
}

function BackToDiscussions({to}: {to: string}) {
    return <Button minH="44px" alignSelf="start" variant="ghost" asChild><Link to={to}><LuArrowLeft/> Back to discussions</Link></Button>;
}

function Loading({label}: {label: string}) {
    return <HStack justify="center" py={10} role="status"><Loader/><Text color="fg.muted">{label}</Text></HStack>;
}

function Attribution({userId, createdAt}: {userId: string; createdAt: string}) {
    return <Text color="fg.muted" fontSize="sm"><MemberName userId={userId}/>{" · "}
        <time dateTime={createdAt}>{new Date(createdAt).toLocaleDateString(undefined, {year: "numeric", month: "short", day: "numeric"})}</time>
    </Text>;
}

function ThreadBadges({thread}: {thread: DiscussionThread}) {
    return <HStack gap={2} wrap="wrap">
        {thread.pinned && <Badge colorPalette="orange"><LuPin/> Pinned</Badge>}
        {thread.promptKind && <Badge variant="subtle">Organizer prompt</Badge>}
        {thread.locked && <Badge variant="outline"><LuLock/> Locked</Badge>}
        {thread.spoiler && <Badge variant="outline" colorPalette="orange">Spoiler</Badge>}
    </HStack>;
}

function ThreadView({clubId, thread, moderator, readOnly, discussionUrl}: {
    clubId: string; thread: DiscussionThread; moderator: boolean; readOnly: boolean; discussionUrl: string;
}) {
    const {currentData: replies = [], isLoading, error, refetch} = useGetDiscussionRepliesQuery({clubId, threadId: thread.id});
    return <MemberNamesProvider userIds={[thread.authorUserId, ...replies.map(reply => reply.authorUserId)]}>
        <Stack gap={6}>
            <BackToDiscussions to={discussionUrl}/>
            <PostCard post={thread} thread={thread} moderator={moderator} readOnly={readOnly}/>
            <Heading as="h3" size="lg" fontFamily="Georgia, serif"><HStack><LuMessageCircle/> Conversation</HStack></Heading>
            {isLoading ? <Loading label="Loading replies"/> : error
                ? <ErrorState onRetry={() => void refetch()}>Replies could not be loaded. Your draft will stay here while you try again.</ErrorState>
                : replies.length === 0 ? <Text color="fg.muted">No replies yet. Add the first thought.</Text>
                    : <Stack gap={3}>{replies.map(reply => <PostCard key={reply.id} post={reply} thread={thread} moderator={moderator} readOnly={readOnly}/>)}</Stack>}
            {readOnly || thread.locked
                ? <Text color="fg.muted"><LuLock style={{display: "inline", marginRight: 6}}/>{readOnly ? "This archived discussion is read-only." : "This discussion is locked. You can still read the conversation."}</Text>
                : <CreateReplyForm clubId={clubId} threadId={thread.id}/>}
        </Stack>
    </MemberNamesProvider>;
}

function PostCard({post, thread, moderator, readOnly}: {
    post: DiscussionThread | DiscussionReply; thread: DiscussionThread; moderator: boolean; readOnly: boolean;
}) {
    const isThread = "title" in post;
    const author = post.authorUserId === sessionStorage.getItem("user_id");
    const [fetchThread, threadRead] = useLazyGetDiscussionThreadQuery();
    const [fetchReply, replyRead] = useLazyGetDiscussionReplyQuery();
    const [updateThread, threadUpdate] = useUpdateDiscussionThreadMutation();
    const [updateReply, replyUpdate] = useUpdateDiscussionReplyMutation();
    const [deleteThread] = useDeleteDiscussionThreadMutation();
    const [deleteReply] = useDeleteDiscussionReplyMutation();
    const [moderateThread, threadModeration] = useModerateDiscussionThreadMutation();
    const [moderateReply, replyModeration] = useModerateDiscussionReplyMutation();
    const [revealed, setRevealed] = useState(false);
    const [editing, setEditing] = useState(false);
    const [title, setTitle] = useState(isThread ? post.title : "");
    const [body, setBody] = useState("");
    const [readFailed, setReadFailed] = useState(false);
    const [editFailed, setEditFailed] = useState(false);
    const reading = threadRead.isFetching || replyRead.isFetching;
    const updating = threadUpdate.isLoading || replyUpdate.isLoading;
    const moderation = threadModeration.isLoading || replyModeration.isLoading;
    const read = isThread ? threadRead : replyRead;
    const canEdit = author && !readOnly && !thread.locked;
    const canShowEditor = canEdit && (!post.spoiler || (!read.isError && !read.isFetching && read.currentData?.body !== undefined));
    const displayedBody = post.spoiler ? (revealed && !read.isError && !read.isFetching ? read.currentData?.body : undefined) : post.body;

    const retrieve = async () => {
        if (isThread) return fetchThread({clubId: post.clubId, threadId: post.id, revealSpoilers: true}).unwrap();
        return fetchReply({clubId: post.clubId, replyId: post.id, revealSpoilers: true}).unwrap();
    };
    const reveal = async () => {
        setReadFailed(false);
        try {
            const content = await retrieve();
            if (content.body === undefined) throw new Error("Content unavailable");
            setRevealed(true);
        } catch {setReadFailed(true);}
    };
    const edit = async () => {
        if (!canEdit) return;
        setReadFailed(false);
        try {
            const content = post.spoiler ? await retrieve() : post;
            if (content.body === undefined) throw new Error("Content unavailable");
            setTitle(isThread ? post.title : "");
            setBody(content.body);
            setEditing(true);
            setEditFailed(false);
        } catch {setReadFailed(true);}
    };
    const save = async (event: FormEvent) => {
        event.preventDefault();
        if (!canShowEditor || !body.trim() || (isThread && !title.trim())) return;
        setEditFailed(false);
        try {
            if (isThread) await updateThread({clubId: post.clubId, threadId: post.id, title: title.trim(), body: body.trim(), spoiler: post.spoiler}).unwrap();
            else await updateReply({clubId: post.clubId, threadId: thread.id, replyId: post.id, body: body.trim(), spoiler: post.spoiler}).unwrap();
            setEditing(false);
        } catch {setEditFailed(true);}
    };
    const remove = async () => {
        if (isThread) return deleteThread({clubId: post.clubId, threadId: post.id}).unwrap();
        return deleteReply({clubId: post.clubId, threadId: thread.id, replyId: post.id}).unwrap();
    };
    const moderate = async (action: ModerationAction) => {
        if (isThread) return moderateThread({clubId: post.clubId, threadId: post.id, action}).unwrap();
        if (action === "hide" || action === "delete" || action === "restore")
            return moderateReply({clubId: post.clubId, threadId: thread.id, replyId: post.id, action}).unwrap();
    };
    const [moderationFailed, setModerationFailed] = useState(false);
    const quickModerate = async (action: ModerationAction) => {
        setModerationFailed(false);
        try {await moderate(action);} catch {setModerationFailed(true);}
    };

    return <Card.Root variant="outline" bg="bg.panel"><Card.Body><Stack gap={4}>
        {isThread && <><ThreadBadges thread={post}/><Heading as="h2" size="xl" fontFamily="Georgia, serif" overflowWrap="anywhere">{post.title}</Heading></>}
        {!isThread && post.spoiler && <Badge alignSelf="start" variant="outline" colorPalette="orange">Spoiler</Badge>}
        <Attribution userId={post.authorUserId} createdAt={post.createdAt}/>
        {editing && canShowEditor ? <Stack as="form" gap={3} onSubmit={save}>
            {isThread && <TextField label="Discussion title" value={title} maxLength={160} onChange={event => setTitle(event.target.value)}/>}
            <label htmlFor={`edit-${post.id}`}>{isThread ? "Discussion" : "Reply"}</label>
            <Textarea id={`edit-${post.id}`} value={body} maxLength={10000} minH="160px" onChange={event => setBody(event.target.value)} required/>
            {post.spoiler && <Text fontSize="sm" color="fg.muted">This post will keep its spoiler warning.</Text>}
            {editFailed && <Text role="alert" color="fg.error">Changes were not saved. Your draft is intact. Try Save changes again.</Text>}
            <HStack wrap="wrap"><Button minH="44px" type="submit" loading={updating} disabled={!body.trim() || (isThread && !title.trim())}>Save changes</Button>
                <Button minH="44px" variant="ghost" disabled={updating} onClick={() => setEditing(false)}>Cancel editing</Button></HStack>
        </Stack> : post.spoiler && displayedBody === undefined
            ? <Box bg="bg.subtle" borderRadius="lg" p={4}><Stack align="start" gap={3}>
                <Text color="fg.muted">This {isThread ? "discussion" : "reply"} contains spoilers.</Text>
                <Button minH="44px" variant="outline" onClick={() => void reveal()} loading={reading}>Show spoiler</Button>
            </Stack></Box> : <Text whiteSpace="pre-wrap" overflowWrap="anywhere" lineHeight="tall">{displayedBody}</Text>}
        {readFailed && <Text role="alert" color="fg.error">The post could not be loaded. Try Show spoiler or Edit again. Nothing has been changed.</Text>}
        {!readOnly && (author && !thread.locked || moderator) && <Box as="details">
            <Box as="summary" cursor="pointer" py={3} fontSize="sm" color="fg.muted" aria-label={isThread ? "Discussion actions" : "Reply actions"}>Post actions</Box>
            <Stack align="start" gap={3} pt={2}>
                {author && !thread.locked && <>
                    <Button minH="44px" variant="ghost" loading={reading} onClick={() => void edit()} disabled={editing && canShowEditor}>Edit{post.spoiler ? " (loads spoiler)" : ""}</Button>
                    <ConfirmAction title={`Delete your ${isThread ? "discussion" : "reply"}?`}
                        description={isThread ? "This discussion and its replies will no longer be visible to club members." : "Your reply will no longer be visible to club members."}
                        actionLabel={`Delete my ${isThread ? "discussion" : "reply"}`} onConfirm={remove} destructive/>
                </>}
                {moderator && <>
                    {isThread && <HStack wrap="wrap">
                        <Button minH="44px" variant="outline" loading={moderation} onClick={() => void quickModerate(thread.pinned ? "unpin" : "pin")}>{thread.pinned ? "Unpin discussion" : "Pin discussion"}</Button>
                        <Button minH="44px" variant="outline" loading={moderation} onClick={() => void quickModerate(thread.locked ? "unlock" : "lock")}>{thread.locked ? "Unlock discussion" : "Lock discussion"}</Button>
                    </HStack>}
                    <ConfirmAction title={`Hide this ${isThread ? "discussion" : "reply"}?`} description="It will be removed from the conversation. Organizers can restore it in Manage."
                        actionLabel="Hide as organizer" onConfirm={() => moderate("hide")} destructive/>
                    <ConfirmAction title={`Delete this ${isThread ? "discussion" : "reply"}?`} description="It will no longer be visible to club members. A recovery record remains available to organizers."
                        actionLabel="Delete as organizer" onConfirm={() => moderate("delete")} destructive/>
                </>}
                {moderationFailed && <Text role="alert" color="fg.error">The change was not saved. Try the action again.</Text>}
            </Stack>
        </Box>}
    </Stack></Card.Body></Card.Root>;
}

function CreateThreadForm({clubId, moderator, onCreated}: {clubId: string; moderator: boolean; onCreated: () => void}) {
    const [title, setTitle] = useState("");
    const [body, setBody] = useState("");
    const [spoiler, setSpoiler] = useState(false);
    const [promptKind, setPromptKind] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [create, {isLoading, error}] = useCreateDiscussionThreadMutation();
    const submit = async (event: FormEvent) => {
        event.preventDefault();
        setSubmitted(true);
        if (!title.trim() || !body.trim()) return;
        try {
            await create({clubId, title: title.trim(), body: body.trim(), spoiler, ...(moderator ? {promptKind} : {})}).unwrap();
            setTitle(""); setBody(""); setSpoiler(false); setPromptKind(false); setSubmitted(false);
            onCreated();
        } catch { /* Mutation state preserves the draft and reports failure. */ }
    };
    return <Card.Root borderColor="orange.muted"><Card.Body as="form" onSubmit={submit}><Stack gap={4}>
        <Heading as="h3" size="lg" fontFamily="Georgia, serif">Start a discussion</Heading>
        <TextField label="Title" value={title} maxLength={160} onChange={event => setTitle(event.target.value)}
            error={submitted && !title.trim()} errorText="Give your discussion a title."/>
        <label htmlFor="new-thread-body">What would you like to share?</label>
        <Textarea id="new-thread-body" value={body} maxLength={10000} minH="160px" onChange={event => setBody(event.target.value)}
            aria-invalid={submitted && !body.trim()} aria-describedby={submitted && !body.trim() ? "new-thread-error" : undefined}/>
        {submitted && !body.trim() && <Text id="new-thread-error" color="fg.error">Add some discussion text before posting.</Text>}
        <HStack wrap="wrap" gap={4}>
            <label><input type="checkbox" checked={spoiler} onChange={event => setSpoiler(event.target.checked)}/> Contains spoilers</label>
            {moderator && <label><input type="checkbox" checked={promptKind} onChange={event => setPromptKind(event.target.checked)}/> Organizer prompt</label>}
        </HStack>
        {error && <Text role="alert" color="fg.error">Your discussion was not posted. Your draft is safe. Check your connection and try Post discussion again.</Text>}
        <Button minH="44px" type="submit" alignSelf="start" colorPalette="orange" loading={isLoading}>Post discussion</Button>
    </Stack></Card.Body></Card.Root>;
}

function CreateReplyForm({clubId, threadId}: {clubId: string; threadId: string}) {
    const [body, setBody] = useState("");
    const [spoiler, setSpoiler] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [create, {isLoading, error}] = useCreateDiscussionReplyMutation();
    const submit = async (event: FormEvent) => {
        event.preventDefault();
        setSubmitted(true);
        if (!body.trim()) return;
        try {
            await create({clubId, threadId, body: body.trim(), spoiler}).unwrap();
            setBody(""); setSpoiler(false); setSubmitted(false);
        } catch { /* Mutation state preserves the draft and reports failure. */ }
    };
    return <Card.Root variant="subtle"><Card.Body as="form" onSubmit={submit}><Stack gap={4}>
        <Heading as="h3" size="md" fontFamily="Georgia, serif">Add to the conversation</Heading>
        <label htmlFor="new-reply-body">Your reply</label>
        <Textarea id="new-reply-body" value={body} maxLength={10000} minH="120px" onChange={event => setBody(event.target.value)}
            aria-invalid={submitted && !body.trim()} aria-describedby={submitted && !body.trim() ? "new-reply-error" : undefined}/>
        {submitted && !body.trim() && <Text id="new-reply-error" color="fg.error">Write a reply before posting.</Text>}
        <label><input type="checkbox" checked={spoiler} onChange={event => setSpoiler(event.target.checked)}/> Contains spoilers</label>
        {error && <Text role="alert" color="fg.error">Your reply was not posted. Your draft is safe. Try Post reply again, or check whether the discussion is still open.</Text>}
        <Button minH="44px" type="submit" alignSelf="start" colorPalette="orange" loading={isLoading}>Post reply</Button>
    </Stack></Card.Body></Card.Root>;
}
