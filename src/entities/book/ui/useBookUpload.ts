import {useRef, useState} from "react";
import {useCreateAudiobookMutation, useCreateBookMutation, usePreviewAudiobookMutation} from "@/entities/book";
import {isFetchBaseQueryError, isErrorWithMessage} from "@/shared/api/rtk-query";

export type FileUploadStatus = {
    name: string;
    status: "pending" | "uploading" | "success" | "skipped" | "failed";
    error?: string;
    metadata?: BookUploadMetadata;
    missingFields?: (keyof BookUploadMetadata)[];
};
export type BookUploadMetadata = {title?: string; author?: string};
type UploadMetadata = BookUploadMetadata | undefined;
type AudiobookUpload = {title: string; author?: string; files: File[]};
type UploadJob = {name: string; metadata: BookUploadMetadata; run: (metadata: BookUploadMetadata) => Promise<unknown>};

function getErrorMessage(error: unknown): string {
    if (isFetchBaseQueryError(error)) {
        if (isErrorWithMessage(error.data)) return error.data.message;
        return typeof error.data === "string" ? error.data : JSON.stringify(error.data) || "The upload failed. Please try again.";
    }
    if (isErrorWithMessage(error)) return error.message;
    return "The upload failed. Please try again.";
}

function getMissingMetadata(error: unknown): Pick<FileUploadStatus, "missingFields" | "metadata"> {
    if (!isFetchBaseQueryError(error) || error.status !== 400) return {};
    const data = error.data;
    if (typeof data !== "object" || data === null) return {};
    const missingFields = "missingFields" in data && Array.isArray(data.missingFields)
        ? data.missingFields.filter((field): field is keyof BookUploadMetadata => field === "title" || field === "author")
        : [];
    if (!missingFields.length && isErrorWithMessage(data)) {
        for (const field of ["title", "author"] as const) {
            if (data.message.includes(`Could not determine "${field}"`) || data.message === `Audiobook ${field} is required`) {
                missingFields.push(field);
            }
        }
    }
    const metadata: BookUploadMetadata = {};
    if ("metadata" in data && typeof data.metadata === "object" && data.metadata !== null) {
        if ("title" in data.metadata && typeof data.metadata.title === "string") metadata.title = data.metadata.title;
        if ("author" in data.metadata && typeof data.metadata.author === "string") metadata.author = data.metadata.author;
    }
    return {missingFields, metadata};
}

export function useBookUpload() {
    const [createBook] = useCreateBookMutation();
    const [createAudiobook] = useCreateAudiobookMutation();
    const [previewAudiobook] = usePreviewAudiobookMutation();
    const [uploadStatuses, setUploadStatuses] = useState<FileUploadStatus[]>([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const pending = useRef(false);
    const jobsRef = useRef<UploadJob[]>([]);
    const failedIndices = useRef<number[]>([]);

    const runJobs = async (jobs: UploadJob[], indices: number[]) => {
        pending.current = true;
        setIsUploading(true);
        setIsDialogOpen(true);
        const selected = new Set(indices);
        failedIndices.current = failedIndices.current.filter(index => !selected.has(index));
        setUploadStatuses(previous => previous.map((status, index) => selected.has(index) ? {...status, status: "pending", error: undefined, missingFields: undefined} : status));
        try {
            for (const index of indices) {
                setUploadStatuses(previous => previous.map((status, i) => i === index ? {...status, status: "uploading", error: undefined} : status));
                try {
                    const result = await jobs[index].run(jobs[index].metadata);
                    const skipped = typeof result === "object" && result !== null && "skipped" in result && result.skipped === true;
                    setUploadStatuses(previous => previous.map((status, i) => i === index ? {...status, status: skipped ? "skipped" : "success"} : status));
                } catch (error) {
                    const details = getMissingMetadata(error);
                    jobs[index].metadata = {...jobs[index].metadata, ...details.metadata};
                    failedIndices.current.push(index);
                    setUploadStatuses(previous => previous.map((status, i) => i === index ? {
                        ...status, status: "failed", error: getErrorMessage(error),
                        metadata: jobs[index].metadata, missingFields: details.missingFields,
                    } : status));
                }
            }
        } finally {
            pending.current = false;
            setIsUploading(false);
        }
    };

    // A directory is one batch so audio groups never replace file outcomes.
    const processBatch = async (files: File[], metadata: UploadMetadata[] = [], audiobooks: AudiobookUpload[] = []) => {
        if (pending.current) return;
        const jobs: UploadJob[] = [
            ...files.map((file, index) => ({
                name: file.name,
                metadata: {...metadata[index]},
                run: (values: BookUploadMetadata) => createBook({file, ...values, isFavorite: false}).unwrap(),
            })),
            ...audiobooks.map(audiobook => ({
                name: audiobook.title,
                metadata: {title: audiobook.title, author: audiobook.author},
                run: (values: BookUploadMetadata) => createAudiobook({...audiobook, ...values, title: values.title ?? audiobook.title}).unwrap(),
            })),
        ];
        if (!jobs.length) return;
        jobsRef.current = jobs;
        failedIndices.current = [];
        setUploadStatuses(jobs.map(({name}) => ({name, status: "pending"})));
        await runJobs(jobs, jobs.map((_, index) => index));
    };

    return {
        uploadStatuses,
        isDialogOpen,
        isUploading,
        processBatch,
        processFiles: (files: File[], metadata: UploadMetadata[] = []) => processBatch(files, metadata),
        processAudiobooks: (audiobooks: AudiobookUpload[]) => processBatch([], [], audiobooks),
        retryFailed: async () => {
            if (!pending.current && failedIndices.current.length) await runJobs(jobsRef.current, [...failedIndices.current]);
        },
        retryWithMetadata: async (index: number, metadata: BookUploadMetadata) => {
            if (pending.current || !failedIndices.current.includes(index)) return;
            jobsRef.current[index].metadata = {
                ...jobsRef.current[index].metadata,
                title: metadata.title?.trim() || jobsRef.current[index].metadata.title,
                author: metadata.author?.trim() || jobsRef.current[index].metadata.author,
            };
            await runJobs(jobsRef.current, [index]);
        },
        previewAudiobook: (files: File[], relativePaths: string[]) => previewAudiobook({files, relativePaths}).unwrap(),
        closeDialog: () => {
            if (pending.current) return;
            setIsDialogOpen(false);
            jobsRef.current = [];
            failedIndices.current = [];
        },
    };
}
