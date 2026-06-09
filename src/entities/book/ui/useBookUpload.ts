import {useState} from "react";
import {type CreateBookRequest, useCreateBookMutation} from "@/entities/book";
import {isFetchBaseQueryError, isErrorWithMessage} from "@/shared/api/rtk-query";
import {toaster} from "@/shared/ui/toaster";

export type FileUploadStatus = {
    name: string;
    status: "pending" | "uploading" | "success" | "skipped" | "failed";
    error?: string;
};

function getErrorMessage(error: unknown): string {
    if (isFetchBaseQueryError(error)) {
        return typeof error.data === "string" ? error.data : JSON.stringify(error.data);
    }
    if (isErrorWithMessage(error)) {
        return error.message;
    }
    return "Unknown error";
}

export function useBookUpload() {
    const [createBook] = useCreateBookMutation();
    const [uploadStatuses, setUploadStatuses] = useState<FileUploadStatus[]>([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    const processFiles = async (files: File[]) => {
        if (!files || files.length === 0) return;

        const initialStatuses: FileUploadStatus[] = files.map(f => ({
            name: f.name,
            status: "pending",
        }));
        setUploadStatuses(initialStatuses);
        setIsDialogOpen(true);
        setIsUploading(true);

        let successCount = 0;
        let failedCount = 0;

        for (let i = 0; i < files.length; i++) {
            const file = files[i];

            setUploadStatuses(prev =>
                prev.map((s, idx) => idx === i ? {...s, status: "uploading"} : s)
            );

            try {
                const createBookRequest: CreateBookRequest = {
                    file,
                    isFavorite: false,
                };

                const result = await createBook(createBookRequest).unwrap();
                const wasSkipped = 'skipped' in result && result.skipped === true;
                setUploadStatuses(prev =>
                    prev.map((s, idx) => idx === i ? {...s, status: wasSkipped ? "skipped" : "success"} : s)
                );
                if (!wasSkipped) successCount++;
            } catch (e) {
                setUploadStatuses(prev =>
                    prev.map((s, idx) =>
                        idx === i ? {...s, status: "failed", error: getErrorMessage(e)} : s
                    )
                );
                failedCount++;
            }
        }

        setIsUploading(false);

        if (failedCount === 0 && successCount > 0) {
            toaster.create({
                title: `${successCount} book${successCount > 1 ? "s" : ""} added successfully!`,
                type: "success",
            });
        }
    };

    return {
        uploadStatuses,
        isDialogOpen,
        isUploading,
        processFiles,
        closeDialog: () => setIsDialogOpen(false),
    };
}
