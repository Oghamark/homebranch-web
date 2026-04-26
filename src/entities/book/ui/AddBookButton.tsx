import {type ButtonProps, FileUpload, Menu, useFileUploadContext} from "@chakra-ui/react";
import {HiPlus} from "react-icons/hi";
import SubmitButton from "@/shared/ui/SubmitButton";
import {toaster} from "@/shared/ui/toaster";
import {type CreateBookRequest, useCreateBookMutation} from "@/entities/book";
import {isFetchBaseQueryError, isErrorWithMessage} from "@/shared/api/rtk-query";
import type {FileAcceptDetails} from "@zag-js/file-upload";
import {useEffect, useRef, useState} from "react";
import {UploadProgressDialog} from "./UploadProgressDialog";

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

function ClearFilesOnComplete({ isUploading }: { isUploading: boolean }) {
    const api = useFileUploadContext();
    const clearFilesRef = useRef(api.clearFiles);
    clearFilesRef.current = api.clearFiles;
    const prevIsUploading = useRef(false);

    useEffect(() => {
        if (prevIsUploading.current && !isUploading) {
            clearFilesRef.current();
        }
        prevIsUploading.current = isUploading;
    }, [isUploading]);

    return null;
}

export function AddBookButton(buttonProps: ButtonProps) {
    const [createBook] = useCreateBookMutation();
    const [uploadStatuses, setUploadStatuses] = useState<FileUploadStatus[]>([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const directoryInputRef = useRef<HTMLInputElement>(null);

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

    const _handleMultiSelect = async ({files}: FileAcceptDetails) => {
        await processFiles(files);
    };

    const _handleDirectorySelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const fileList = e.target.files;
        if (!fileList) return;

        const supportedFiles = Array.from(fileList).filter(f => /\.(epub|pdf)$/i.test(f.name));

        if (supportedFiles.length === 0) {
            toaster.create({
                title: "No EPUB or PDF files found in the selected directory.",
                type: "warning",
            });
            return;
        }

        await processFiles(supportedFiles);
        e.target.value = "";
    };

    return (
        <>
            <input
                ref={directoryInputRef}
                type="file"
                // @ts-expect-error - webkitdirectory is non-standard but widely supported
                webkitdirectory="true"
                style={{display: "none"}}
                onChange={_handleDirectorySelect}
            />

            <UploadProgressDialog
                statuses={uploadStatuses}
                isOpen={isDialogOpen}
                isUploading={isUploading}
                onClose={() => setIsDialogOpen(false)}
            />

            <FileUpload.Root
                accept={".epub,.pdf"}
                maxFiles={Number.MAX_SAFE_INTEGER}
                onFileAccept={_handleMultiSelect}
            >
                <ClearFilesOnComplete isUploading={isUploading}/>
                <FileUpload.HiddenInput accept=".epub,.pdf" multiple/>
                <Menu.Root>
                    <Menu.Trigger asChild>
                        <SubmitButton
                            variant={"outline"}
                            size="sm"
                            width={"100%"}
                            loading={isUploading}
                            {...buttonProps}
                        >
                            <HiPlus/> Add Book
                        </SubmitButton>
                    </Menu.Trigger>
                        <Menu.Positioner>
                            <Menu.Content>
                                <FileUpload.Trigger asChild>
                                    <Menu.Item value="files">
                                        Select Files
                                    </Menu.Item>
                                </FileUpload.Trigger>
                                <Menu.Item
                                    value="directory"
                                    onClick={() => directoryInputRef.current?.click()}
                                >
                                    Select Directory
                                </Menu.Item>
                            </Menu.Content>
                        </Menu.Positioner>
                </Menu.Root>
            </FileUpload.Root>
        </>
    );
}
