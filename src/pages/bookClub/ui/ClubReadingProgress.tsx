import {useId} from "react";
import {Badge, Flex, Heading, HStack, Progress, Stack, Text} from "@chakra-ui/react";
import type {BookClubSchedule, ProgressStatus} from "@/entities/bookClub";
import {MemberName, MemberNamesProvider} from "./MemberName";

const labels: Record<ProgressStatus, string> = {not_started: "Not started", in_progress: "In progress", completed: "Complete"};

export function ClubReadingProgress({schedule}: {schedule: BookClubSchedule}) {
    const headingId = useId();
    const members = schedule.sharedProgress ?? [];
    const currentUserId = sessionStorage.getItem("user_id");
    return <Stack as="section" aria-labelledby={headingId} gap={4} borderTopWidth="1px" pt={5}>
        <Stack gap={2}>
            <Heading id={headingId} as="h2" size="xl" fontFamily="Georgia, serif">Club reading progress</Heading>
            <Text color="fg.muted" fontSize="sm">Everyone in the club can see these reading steps. Private reading positions and edition labels stay private.</Text>
        </Stack>
        <MemberNamesProvider userIds={members.map(member => member.userId)}>
            <Stack as="ul" listStyleType="none" p={0} m={0} gap={3}>
                {members.map(member => <MemberProgress key={member.userId} member={member} schedule={schedule} isYou={member.userId === currentUserId}/>)}
            </Stack>
        </MemberNamesProvider>
    </Stack>;
}

function MemberProgress({member, schedule, isYou}: {
    member: NonNullable<BookClubSchedule["sharedProgress"]>[number]; schedule: BookClubSchedule; isYou: boolean;
}) {
    const headingId = useId();
    const progress = new Map(member.milestones.map(step => [step.milestoneId, step]));
    const completed = schedule.milestones.filter(step => progress.get(step.id)?.status === "completed").length;
    const started = schedule.milestones.filter(step => progress.get(step.id)?.status === "in_progress").length;
    const total = schedule.milestones.length;
    return <Stack as="li" borderWidth="1px" borderRadius="xl" p={{base: 4, md: 5}} gap={3} bg="bg.panel">
        <Flex justify="space-between" align="center" gap={2} wrap="wrap">
            <HStack gap={2} minW={0}><Heading id={headingId} as="h3" size="md" overflowWrap="anywhere"><MemberName userId={member.userId}/></Heading>{isYou && <Badge>You</Badge>}</HStack>
            <Text color="fg.muted" fontSize="sm">{total ? `${completed} of ${total} steps complete` : "Reading plan not set yet"}</Text>
        </Flex>
        {total > 0 && <>
            <Progress.Root value={completed / total * 100} colorPalette="orange" size="sm">
                <Progress.Track aria-labelledby={headingId} borderRadius="full"><Progress.Range/></Progress.Track>
            </Progress.Root>
            <Text color="fg.muted" fontSize="sm">{completed === total ? "Finished the plan" : started ? `${started} ${started === 1 ? "step" : "steps"} in progress` : completed ? "Reading at their own pace" : "Not started"}</Text>
            <details><summary style={{cursor: "pointer", paddingBlock: "12px", fontSize: "14px"}}>View reading steps</summary>
                <Stack as="ul" listStyleType="none" m={0} p={0} gap={3} pt={2}>{schedule.milestones.map(step => {
                    const status = progress.get(step.id)?.status ?? "not_started";
                    const percentage = progress.get(step.id)?.percentage;
                    return <Flex as="li" key={step.id} justify="space-between" align="start" gap={3} wrap="wrap">
                        <Text fontSize="sm" overflowWrap="anywhere" minW={0}>{step.name}</Text>
                        <Badge variant="subtle" colorPalette={status === "completed" ? "orange" : undefined}>{labels[status]}{status === "in_progress" && percentage != null ? ` · ${percentage}%` : ""}</Badge>
                    </Flex>;
                })}</Stack>
            </details>
        </>}
    </Stack>;
}
