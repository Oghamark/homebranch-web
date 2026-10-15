import {useState} from "react";
import {Badge, Button, Flex, Heading, HStack, Input, NativeSelect, Progress, Stack, Text} from "@chakra-ui/react";
import {type BookClub, type Milestone, type ProgressStatus, useClearMilestoneMappingMutation, useGetBookClubScheduleQuery, useGetReadingCopyQuery, useSetMilestoneMappingMutation, useSetMilestoneProgressMutation, useSetProgressSharingMutation} from "@/entities/bookClub";
import {ClubShell} from "./ClubShell";
import {ClubLoading, EmptyState, ErrorState} from "./ClubUI";
import {ReadingCopyPanel} from "./ReadingCopyPanel";
import {ReadingPlanEditor} from "./ReadingPlanEditor";
import {MemberName, MemberNamesProvider} from "./MemberName";

export function BookClubReadingPlanPage({clubId}: {clubId: string}) {
    return <ClubShell clubId={clubId}>{club => <ReadingPlan club={club}/>}</ClubShell>;
}

function ReadingPlan({club}: {club: BookClub}) {
    const query = useGetBookClubScheduleQuery(club.id);
    const copy = useGetReadingCopyQuery({clubId: club.id, workId: club.selectedWork.id});
    const [sharing, sharingState] = useSetProgressSharingMutation();
    const [editing, setEditing] = useState(false);
    const archived = club.status === "archived";
    const manager = club.currentMembershipRole === "owner" || club.currentMembershipRole === "moderator";
    const canTrack = !!copy.data?.available && !!copy.data.book && !copy.error && !archived;
    if (query.isLoading) return <ClubLoading/>;
    if (query.error || !query.data) return <ErrorState onRetry={query.refetch}>The reading plan couldn't be loaded.</ErrorState>;
    const data = query.data;
    const completed = data.milestones.filter(step => step.memberProgress?.status === "completed").length;
    return <Stack gap={6}>
        <Flex justify="space-between" align="center" wrap="wrap" gap={3}><Stack gap={2}><Heading as="h2" size="2xl" fontFamily="Georgia, serif">One chapter at a time.</Heading>
            <Text color="fg.muted">{data.startDate ? `Starts ${formatDate(data.startDate)}` : "Read at your own pace"}{data.completionDate ? ` · Finish by ${formatDate(data.completionDate)}` : ""}</Text></Stack>
            {manager && !archived && <Button variant="outline" minH="44px" onClick={() => setEditing(!editing)} aria-expanded={editing}>{editing ? "Close editor" : "Edit reading plan"}</Button>}
        </Flex>
        {editing && <ReadingPlanEditor clubId={club.id} schedule={data} onSaved={() => setEditing(false)}/>}
        {!archived && !canTrack && <ReadingCopyPanel club={club}/>}
        {data.milestones.length ? <Stack gap={3}>
            <HStack justify="space-between"><Text fontWeight="medium">Your progress</Text><Text color="fg.muted" fontSize="sm">{completed} of {data.milestones.length} complete</Text></HStack>
            <Progress.Root aria-label="Completed reading steps" value={completed / data.milestones.length * 100} colorPalette="orange" size="sm"><Progress.Track borderRadius="full"><Progress.Range/></Progress.Track></Progress.Root>
            {data.milestones.map(step => <ReadingStep key={step.id} clubId={club.id} step={step} canTrack={canTrack} archived={archived}/>)}
        </Stack> : <EmptyState title="A reading plan is still taking shape">{manager && !archived ? "Use Edit reading plan to add chapters, parts, or a few comfortable checkpoints." : "There are no reading steps yet. Enjoy the book at your own pace and keep the conversation going."}</EmptyState>}
        {!archived && <Stack gap={3} borderTopWidth="1px" pt={5}>
            <Heading size="md">Reading together, privately</Heading>
            <label style={{display: "flex", gap: "10px", alignItems: "center", minHeight: "44px"}}>
                <input type="checkbox" checked={data.progressSharingEnabled ?? false} disabled={sharingState.isLoading} onChange={e => {void sharing({clubId: club.id, enabled: e.target.checked});}}/> Share my reading progress
            </label>
            <Text color="fg.muted" fontSize="sm">Off unless you choose it. Members can see which steps you've started or finished, never your copy, chapter labels, reading position, or history.</Text>
            {sharingState.error && <Text role="alert" color="fg.error">Your sharing preference couldn't be saved. Please try again.</Text>}
            {sharingState.isLoading && <Text role="status" fontSize="sm">Saving your preference...</Text>}
        </Stack>}
        {!!data.sharedProgress?.length && <Stack gap={3} borderTopWidth="1px" pt={5}><Heading size="md">Reading alongside you</Heading><Text color="fg.muted" fontSize="sm">Only progress members have chosen to share appears here.</Text>
            <MemberNamesProvider userIds={data.sharedProgress.map(row => row.userId)}>
                {Array.from(new Set(data.sharedProgress.map(row => row.userId))).map(userId => {
                    const rows = data.sharedProgress!.filter(row => row.userId === userId);
                    return <HStack key={userId} justify="space-between" wrap="wrap"><Text><MemberName userId={userId}/></Text><Text color="fg.muted" fontSize="sm">{rows.filter(row => row.status === "completed").length} steps finished · {rows.filter(row => row.status === "in_progress").length} in progress</Text></HStack>;
                })}
            </MemberNamesProvider>
        </Stack>}
    </Stack>;
}

function formatDate(date: string) {
    return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {month: "short", day: "numeric", year: "numeric"});
}

function ReadingStep({clubId, step, canTrack, archived}: {clubId: string; step: Milestone; canTrack: boolean; archived: boolean}) {
    const [setProgress, progress] = useSetMilestoneProgressMutation();
    const [setMapping, mapping] = useSetMilestoneMappingMutation();
    const [clearMapping, clearing] = useClearMilestoneMappingMutation();
    const [label, setLabel] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);
    const status = step.memberProgress?.status ?? "not_started";
    const busy = progress.isLoading || mapping.isLoading || clearing.isLoading;
    const saveProgress = async (next: ProgressStatus) => {
        setSaved(false);
        try {await setProgress({clubId, milestoneId: step.id, status: next}).unwrap(); setSaved(true);}
        catch { /* The mutation error is displayed below. */ }
    };
    return <Stack gap={3} p={{base: 4, md: 5}} borderWidth="1px" borderRadius="xl" bg={status === "completed" ? "bg.muted" : "bg.panel"}>
        <Flex justify="space-between" align="center" gap={3} wrap="wrap"><HStack gap={3} minW={0}>
            <Text color="fg.muted" fontSize="sm" minW="24px">{step.position}.</Text><Stack gap={1}><Heading size="md" overflowWrap="anywhere">{step.name}</Heading>
                {step.memberMapping && <Text fontSize="sm" color="fg.muted">Your edition: {step.memberMapping.memberLabel}</Text>}</Stack></HStack>
            {canTrack ? <Button variant={status === "completed" ? "outline" : "solid"} colorPalette="orange" minH="44px" loading={progress.isLoading} disabled={busy} onClick={() => void saveProgress(status === "completed" ? "not_started" : "completed")}>
                {status === "completed" ? "Mark unfinished" : "Mark complete"}
            </Button> : <Badge variant="outline">{status === "completed" ? "Complete" : status === "in_progress" ? "In progress" : "Not started"}</Badge>}
        </Flex>
        {canTrack && <details><summary style={{cursor: "pointer", paddingBlock: "12px", fontSize: "14px"}}>Progress and edition options</summary>
            <Stack gap={4} pt={2}><Stack gap={2}><label htmlFor={`status-${step.id}`}>Your progress</label><NativeSelect.Root disabled={busy}><NativeSelect.Field id={`status-${step.id}`} value={status}
                onChange={e => {const value = e.target.value; if (value === "not_started" || value === "in_progress" || value === "completed") void saveProgress(value);}}>
                <option value="not_started">Not started</option><option value="in_progress">In progress</option><option value="completed">Completed</option>
            </NativeSelect.Field><NativeSelect.Indicator/></NativeSelect.Root></Stack>
                <Stack as="form" gap={2} onSubmit={async e => {
                    e.preventDefault(); setSaved(false);
                    const value = (label ?? step.memberMapping?.memberLabel ?? "").trim();
                    if (!value) return;
                    try {await setMapping({clubId, milestoneId: step.id, memberLabel: value}).unwrap(); setLabel(null); setSaved(true);}
                    catch { /* The mutation error is displayed below. */ }
                }}><label htmlFor={`edition-${step.id}`}>Different chapter names in your edition?</label>
                    <Text color="fg.muted" fontSize="sm">Give this step a private label. Only you can see it.</Text>
                    <Input id={`edition-${step.id}`} maxLength={120} placeholder="For example, Part II, chapter 3" value={label ?? step.memberMapping?.memberLabel ?? ""} disabled={busy} onChange={e => setLabel(e.target.value)}/>
                    <HStack wrap="wrap"><Button type="submit" variant="outline" minH="44px" loading={mapping.isLoading} disabled={busy || !(label ?? step.memberMapping?.memberLabel ?? "").trim()}>Save private label</Button>
                        {step.memberMapping && <Button variant="ghost" minH="44px" loading={clearing.isLoading} disabled={busy} onClick={async () => {
                            setSaved(false);
                            try {await clearMapping({clubId, milestoneId: step.id}).unwrap(); setLabel(null); setSaved(true);}
                            catch { /* The mutation error is displayed below. */ }
                        }}>Remove label</Button>}</HStack>
                </Stack>
            </Stack>
        </details>}
        {!archived && (progress.error || mapping.error || clearing.error) && <Text role="alert" color="fg.error">Your change couldn't be saved. Check that your reading copy is still available and try again.</Text>}
        {saved && <Text role="status" fontSize="sm" color="fg.muted">Saved.</Text>}
    </Stack>;
}
