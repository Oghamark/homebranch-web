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
    const {uploadStatuses, isDialogOpen, isUploading, processFiles, processAudiobooks, closeDialog} = useBookUpload();
    const directoryInputRef = useRef<HTMLInputElement>(null);

    const _handleMultiSelect = async ({files}: FileAcceptDetails) => {
        await processFiles(files);
    };

    const _handleDirectorySelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const fileList = e.target.files;
        if (!fileList) return;

        const supportedFiles = Array.from(fileList).filter(f => /\.(epub|pdf|mp3|m4b)$/i.test(f.name));

        if (supportedFiles.length === 0) {
            toaster.create({
                title: "No supported book files found in the selected directory.",
                type: "warning",
            });
            return;
        }

        const trackGroups = new Map<string, File[]>();
        const individualFiles: File[] = [];
        for (const file of supportedFiles) {
            if (!/\.mp3$/i.test(file.name)) {
                individualFiles.push(file);
                continue;
            }
            const pathParts = (file as File & {webkitRelativePath?: string}).webkitRelativePath?.split("/") ?? [];
            const folder = pathParts[0] || "Audiobook";
            trackGroups.set(folder, [...(trackGroups.get(folder) ?? []), file]);
        }

        if (individualFiles.length) await processFiles(individualFiles);
        const audiobooks = Array.from(trackGroups.entries())
            .filter(([, tracks]) => tracks.length > 1)
            .map(([title, files]) => ({
                title,
                files: files.sort((left, right) =>
                    ((left as File & {webkitRelativePath?: string}).webkitRelativePath || left.name).localeCompare(
                        (right as File & {webkitRelativePath?: string}).webkitRelativePath || right.name,
                        undefined,
                        {numeric: true, sensitivity: "base"},
                    )
                ),
            }));
        const looseTracks = Array.from(trackGroups.values()).filter(tracks => tracks.length === 1).flat();
        if (looseTracks.length) await processFiles(looseTracks);
        await processAudiobooks(audiobooks);
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
                accept={".epub,.pdf,.mp3,.m4b"}
                maxFiles={Number.MAX_SAFE_INTEGER}
                onFileAccept={_handleMultiSelect}
            >
                <ClearFilesOnComplete isUploading={isUploading}/>
                <FileUpload.HiddenInput accept=".epub,.pdf,.mp3,.m4b" multiple/>
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
