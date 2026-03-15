import {Badge} from "@chakra-ui/react";
import type {JobStatus} from "@/entities/job/model/JobModel";

const statusConfig: Record<JobStatus, { color: string; label: string }> = {
    active: {color: "blue", label: "Running"},
    waiting: {color: "yellow", label: "Queued"},
    completed: {color: "green", label: "Completed"},
    failed: {color: "red", label: "Failed"},
    delayed: {color: "orange", label: "Delayed"},
};

interface JobStatusBadgeProps {
    status: JobStatus;
}

export function JobStatusBadge({status}: JobStatusBadgeProps) {
    const config = statusConfig[status] ?? {color: "gray", label: status};
    return (
        <Badge colorPalette={config.color} variant="subtle" size="sm">
            {config.label}
        </Badge>
    );
}
