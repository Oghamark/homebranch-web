import {Box, Flex, Progress, Text} from "@chakra-ui/react";
import type {JobModel} from "@/entities/job/model/JobModel";
import {JobStatusBadge} from "./JobStatusBadge";
import {LuClock, LuCircleCheck, LuCircleX} from "react-icons/lu";

const jobNameLabels: Record<string, string> = {
    "scan-directory": "Library Scan",
    "process-file": "Process File",
    "process-new-file": "Import New Book",
    "sync-metadata": "Sync Metadata",
    "soft-delete-book": "Remove Book",
    "file-removed": "File Removed",
    "rename-legacy-file": "Rename File",
    "scan-duplicates": "Duplicate Scan",
};

function formatTime(iso: string | null): string {
    if (!iso) return "Not available";
    return new Date(iso).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function getJobDescription(job: JobModel): string {
    const data = job.data as Record<string, string | undefined>;
    if (data?.fileName) return data.fileName;
    if (data?.newFileName) return `→ ${data.newFileName}`;
    if (data?.trigger === "manual") return "Manual scan";
    return "";
}

interface JobRowProps {
    job: JobModel;
}

export function JobRow({job}: JobRowProps) {
    const label = jobNameLabels[job.name] ?? job.name;
    const description = getJobDescription(job);
    const StatusIcon = job.status === "completed" ? LuCircleCheck
        : job.status === "failed" ? LuCircleX
            : LuClock;

    return (
        <Flex
            align="start"
            direction={{base: "column", md: "row"}}
            gap={3}
            py={4}
            px={3}
            borderRadius="md"
            _hover={{bg: "bg.subtle"}}
        >
            <Box color={job.status === "failed" ? "red.500" : "fg.muted"} flexShrink={0}>
                <StatusIcon size={16}/>
            </Box>
            <Box flex="1" minW={0} w="full">
                <Flex align="center" gap={2} wrap="wrap">
                    <Text fontWeight="medium" fontSize="sm" overflowWrap="anywhere">
                        {label}
                    </Text>
                    <JobStatusBadge status={job.status}/>
                </Flex>
                {job.status === "active" && typeof job.progress === "number" && (
                    <Progress.Root size="xs" value={job.progress} mt={1} colorPalette="orange">
                        <Progress.Label>Job progress: {job.progress}%</Progress.Label>
                        <Progress.Track>
                            <Progress.Range/>
                        </Progress.Track>
                    </Progress.Root>
                )}
                {description && (
                    <Text fontSize="sm" color="fg.muted" overflowWrap="anywhere">
                        {description}
                    </Text>
                )}
                {job.failedReason && (
                    <Text fontSize="sm" color="fg.error" overflowWrap="anywhere">
                        {job.failedReason}
                    </Text>
                )}
                <Box as="details" mt={2} fontSize="sm">
                    <Box as="summary" cursor="pointer" minH="44px" py={3}>Technical details</Box>
                    <Text overflowWrap="anywhere">Job {job.id} in {job.queue}</Text>
                    {job.attemptsMade !== undefined && <Text>Attempts: {job.attemptsMade}</Text>}
                    <Text>Created: {formatTime(job.createdAt)}</Text>
                    <Text>Started: {formatTime(job.processedAt)}</Text>
                    <Text>Finished: {formatTime(job.finishedAt)}</Text>
                </Box>
            </Box>
            <Text fontSize="xs" color="fg.muted" flexShrink={0}>
                {formatTime(job.finishedAt ?? job.processedAt ?? job.createdAt)}
            </Text>
        </Flex>
    );
}
