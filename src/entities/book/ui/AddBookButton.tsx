import {type ButtonProps, FileUpload, Menu, useFileUploadContext} from "@chakra-ui/react";
import {HiPlus} from "react-icons/hi";
import SubmitButton from "@/shared/ui/SubmitButton";
import {toaster} from "@/shared/ui/toaster";
import type {FileAcceptDetails} from "@zag-js/file-upload";
import {useEffect, useRef} from "react";
import {UploadProgressDialog} from "./UploadProgressDialog";
import {useBookUpload} from "./useBookUpload";
export type {FileUploadStatus} from "./useBookUpload";

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
    const {uploadStatuses, isDialogOpen, isUploading, processFiles, closeDialog} = useBookUpload();
    const directoryInputRef = useRef<HTMLInputElement>(null);

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
                onClose={closeDialog}
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
