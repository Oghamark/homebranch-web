export type JobStatus = 'active' | 'waiting' | 'completed' | 'failed' | 'delayed';

export type JobModel = {
    id: string;
    name: string;
    queue: string;
    status: JobStatus;
    progress: number;
    data: Record<string, unknown>;
    result: unknown;
    failedReason: string | null;
    createdAt: string | null;
    processedAt: string | null;
    finishedAt: string | null;
    attemptsMade?: number;
};

export type JobListResponse = {
    data: JobModel[];
    total: number;
    limit: number;
    offset: number;
};
