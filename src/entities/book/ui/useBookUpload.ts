import {useRef, useState} from "react";
import {useCreateAudiobookMutation, useCreateBookMutation, usePreviewAudiobookMutation} from "@/entities/book";
import {isFetchBaseQueryError, isErrorWithMessage} from "@/shared/api/rtk-query";

export type FileUploadStatus = {
    name: string;
    status: "pending" | "uploading" | "success" | "skipped" | "failed";
    error?: string;
};
type UploadMetadata = {title?: string; author?: string} | undefined;
type AudiobookUpload = {title: string; author?: string; files: File[]};
type UploadJob = {name: string; run: () => Promise<unknown>};

function getErrorMessage(error: unknown): string {
    if (isFetchBaseQueryError(error)) {
        return typeof error.data === "string" ? error.data : JSON.stringify(error.data) || "The upload failed. Please try again.";
    }
    if (isErrorWithMessage(error)) return error.message;
    return "The upload failed. Please try again.";
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
        failedIndices.current = [];
        const selected = new Set(indices);
        setUploadStatuses(previous => previous.map((status, index) => selected.has(index) ? {...status, status: "pending", error: undefined} : status));
        try {
            for (const index of indices) {
                setUploadStatuses(previous => previous.map((status, i) => i === index ? {...status, status: "uploading", error: undefined} : status));
                try {
                    const result = await jobs[index].run();
                    const skipped = typeof result === "object" && result !== null && "skipped" in result && result.skipped === true;
                    setUploadStatuses(previous => previous.map((status, i) => i === index ? {...status, status: skipped ? "skipped" : "success"} : status));
                } catch (error) {
                    failedIndices.current.push(index);
                    setUploadStatuses(previous => previous.map((status, i) => i === index ? {...status, status: "failed", error: getErrorMessage(error)} : status));
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
                run: () => createBook({file, title: metadata[index]?.title, author: metadata[index]?.author, isFavorite: false}).unwrap(),
            })),
            ...audiobooks.map(audiobook => ({
                name: audiobook.title,
                run: () => createAudiobook(audiobook).unwrap(),
            })),
        ];
        if (!jobs.length) return;
        jobsRef.current = jobs;
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
        previewAudiobook: (files: File[], relativePaths: string[]) => previewAudiobook({files, relativePaths}).unwrap(),
        closeDialog: () => {
            if (pending.current) return;
            setIsDialogOpen(false);
            jobsRef.current = [];
            failedIndices.current = [];
        },
    };
}
