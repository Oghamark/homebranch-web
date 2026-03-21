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
    if (!iso) return "—";
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
            align="center"
            gap={3}
            py={2}
            px={3}
            borderRadius="md"
            _hover={{bg: "bg.subtle"}}
        >
            <Box color={job.status === "failed" ? "red.500" : "fg.muted"} flexShrink={0}>
                <StatusIcon size={16}/>
            </Box>
            <Box flex="1" minW={0}>
                <Flex align="center" gap={2}>
                    <Text fontWeight="medium" fontSize="sm" truncate>
                        {label}
                    </Text>
                    <JobStatusBadge status={job.status}/>
                </Flex>
                {job.status === "active" && typeof job.progress === "number" && job.progress > 0 && (
                    <Progress.Root size="xs" value={job.progress} mt={1} colorPalette="blue">
                        <Progress.Track>
                            <Progress.Range/>
                        </Progress.Track>
                    </Progress.Root>
                )}
                {description && (
                    <Text fontSize="xs" color="fg.muted" truncate>
                        {description}
                    </Text>
                )}
                {job.failedReason && (
                    <Text fontSize="xs" color="red.500" truncate>
                        {job.failedReason}
                    </Text>
                )}
            </Box>
            <Text fontSize="xs" color="fg.muted" flexShrink={0}>
                {formatTime(job.finishedAt ?? job.processedAt ?? job.createdAt)}
            </Text>
        </Flex>
    );
}
