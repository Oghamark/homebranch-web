import {Badge, Button, Flex, Grid, Heading, HStack, Progress, Stack, Text} from "@chakra-ui/react";
import {Link} from "react-router";
import {LuArrowRight, LuCheck, LuMessagesSquare} from "react-icons/lu";
import {type BookClub, useGetBookClubMembersQuery, useGetBookClubScheduleQuery, useGetDiscussionThreadsQuery} from "@/entities/bookClub";
import {ClubShell} from "./ClubShell";
import {ReadingCopyPanel} from "./ReadingCopyPanel";
import {ClubLoading, EmptyState, ErrorState} from "./ClubUI";
import {MemberName, MemberNamesProvider} from "./MemberName";
import {ClubActivityPreference} from "@/features/social/ClubActivityPreference";
import {ClubReadingProgress} from "./ClubReadingProgress";
import {useVisibleRefresh} from "@/shared/hooks/useVisibleRefresh";

export function BookClubDetailPage({clubId}: {clubId: string}) {
    return <ClubShell clubId={clubId}>{club => <ClubHome club={club}/>}</ClubShell>;
}

function ClubHome({club}: {club: BookClub}) {
    const schedule = useGetBookClubScheduleQuery(club.id, useVisibleRefresh());
    const discussions = useGetDiscussionThreadsQuery({clubId: club.id});
    const milestones = schedule.data?.milestones ?? [];
    const completed = milestones.filter(step => step.memberProgress?.status === "completed").length;
    const next = milestones.find(step => step.memberProgress?.status !== "completed");
    const manager = club.currentMembershipRole === "owner" || club.currentMembershipRole === "moderator";
    return <Stack gap={7}>
        <Grid templateColumns={{base: "1fr", md: "minmax(0, 1.2fr) minmax(0, 1fr)"}} gap={5}>
            <ReadingCopyPanel club={club}/>
            <Stack gap={4} p={{base: 5, md: 6}} borderWidth="1px" borderRadius="xl" justify="center">
                <Text fontSize="xs" fontWeight="bold" letterSpacing="wider" textTransform="uppercase" color="fg.muted">A little at a time</Text>
                <Heading size="xl" fontFamily="Georgia, serif">Your reading plan</Heading>
                {schedule.isLoading ? <ClubLoading/> : schedule.error ? <ErrorState onRetry={schedule.refetch}>The reading plan couldn't be loaded.</ErrorState>
                    : milestones.length ? <><HStack><LuCheck/><Text>{completed} of {milestones.length} steps complete</Text></HStack>
                        <Progress.Root aria-label="Your reading plan progress" value={completed / milestones.length * 100} colorPalette="orange" size="sm"><Progress.Track borderRadius="full"><Progress.Range/></Progress.Track></Progress.Root>
                        <Text color="fg.muted">{next ? `Next for you: ${next.name}` : "You've finished the plan. There's always more to talk about."}</Text></>
                        : <Text color="fg.muted">{manager && club.status !== "archived" ? "Give everyone a comfortable pace. Add chapters or a few reading checkpoints to get started." : "There's no reading plan yet. Settle into the book at your own pace."}</Text>}
                <Button asChild variant="outline" alignSelf="start" minH="44px"><Link to={`/book-clubs/${club.id}/reading-plan`}>{manager && !milestones.length && club.status !== "archived" ? "Make a reading plan" : "View reading plan"} <LuArrowRight/></Link></Button>
            </Stack>
        </Grid>
        <ClubMembers clubId={club.id}/>
        {schedule.data && !schedule.error && <ClubReadingProgress schedule={schedule.data}/>}
        <Stack gap={4}><Flex justify="space-between" align="center" gap={3} wrap="wrap">
            <Heading size="xl" fontFamily="Georgia, serif">Around the book</Heading><Button asChild variant="ghost" minH="44px"><Link to={`/book-clubs/${club.id}/discussions`}>All discussions <LuArrowRight/></Link></Button></Flex>
            {discussions.isLoading ? <ClubLoading/> : discussions.error ? <ErrorState onRetry={discussions.refetch}>Conversations couldn't be loaded.</ErrorState>
                : !discussions.data?.length ? <EmptyState title="Every conversation starts somewhere" action={<Button asChild minH="44px" variant="outline"><Link to={`/book-clubs/${club.id}/discussions`}><LuMessagesSquare/> Go to discussions</Link></Button>}>
                    Share a first impression, a favorite moment, or a question for the group.
                </EmptyState> : <MemberNamesProvider userIds={discussions.data.slice(0, 3).map(thread => thread.authorUserId)}>
                    <Stack gap={3}>{discussions.data.slice(0, 3).map(thread => <Stack key={thread.id} asChild borderWidth="1px" borderRadius="lg" p={5} gap={2} _hover={{borderColor: "orange.400"}}>
                        <Link to={`/book-clubs/${club.id}/discussions?thread=${encodeURIComponent(thread.id)}`}>
                            <Heading size="md">{thread.title}</Heading><Text color="fg.muted" fontSize="sm"><MemberName userId={thread.authorUserId}/> · {new Date(thread.createdAt).toLocaleDateString()}</Text>
                            <Text color="fg.muted" fontSize="sm" lineClamp={2}>{thread.spoiler ? "Contains spoilers. Open the discussion to choose what to reveal." : thread.body}</Text>
                        </Link>
                    </Stack>)}</Stack>
                </MemberNamesProvider>}
        </Stack>
        {club.status !== "archived" && <ClubActivityPreference clubId={club.id}/>}
        {club.currentMembershipRole === "owner" && club.status !== "archived" && <Text color="fg.muted" fontSize="sm">Your club, your pace. Invite people and adjust club details in <Link style={{textDecoration: "underline"}} to={`/book-clubs/${club.id}/manage`}>Manage</Link>. To leave your club, transfer ownership there first.</Text>}
    </Stack>;
}

function ClubMembers({clubId}: {clubId: string}) {
    const members = useGetBookClubMembersQuery(clubId);
    return <Stack as="section" aria-labelledby="club-members-heading" gap={4} p={{base: 5, md: 6}} borderWidth="1px" borderRadius="xl">
        <Stack gap={1}>
            <Heading id="club-members-heading" as="h2" size="xl" fontFamily="Georgia, serif">Members</Heading>
            <Text color="fg.muted" fontSize="sm">The people reading alongside you.</Text>
        </Stack>
        {members.isLoading ? <ClubLoading/> : members.error || !members.data ? <ErrorState onRetry={members.refetch}>The member list couldn't be loaded.</ErrorState>
            : !members.data.length ? <EmptyState title="No members to show"/> : <MemberNamesProvider userIds={members.data.map(member => member.userId)}>
                <Stack as="ul" gap={3} m={0} p={0} listStyleType="none">
                    {members.data.map(member => <Flex as="li" key={member.userId} justify="space-between" align="center" gap={3} wrap="wrap">
                        <Text fontWeight="medium" overflowWrap="anywhere" minW={0}><MemberName userId={member.userId}/></Text>
                        <Badge variant="subtle" colorPalette={member.role === "member" ? undefined : "orange"}>
                            {member.role === "owner" ? "Club owner" : member.role === "moderator" ? "Moderator" : "Member"}
                        </Badge>
                    </Flex>)}
                </Stack>
            </MemberNamesProvider>}
    </Stack>;
}
