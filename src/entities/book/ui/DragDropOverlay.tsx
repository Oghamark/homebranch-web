import {useCallback, useEffect, useRef, useState} from "react";
import {Box, Icon, Text, VStack} from "@chakra-ui/react";
import {LuUpload} from "react-icons/lu";
import {useBookUpload} from "@/entities/book/ui/useBookUpload";
import {UploadProgressDialog} from "@/entities/book/ui/UploadProgressDialog";
import {toaster} from "@/shared/ui/toaster";

const ACCEPTED_EXTENSIONS = /\.(epub|pdf)$/i;

export function DragDropOverlay() {
    const [isDragging, setIsDragging] = useState(false);
    const dragCounterRef = useRef(0);
    const {uploadStatuses, isDialogOpen, isUploading, processFiles, closeDialog, retryFailed} = useBookUpload();
    const collecting = useRef(false);

    const handleDragEnter = useCallback((e: DragEvent) => {
        if (!e.dataTransfer?.types.includes("Files")) return;
        e.preventDefault();
        dragCounterRef.current += 1;
        if (dragCounterRef.current === 1) {
            setIsDragging(true);
        }
    }, []);

    const handleDragLeave = useCallback((e: DragEvent) => {
        if (!e.dataTransfer?.types.includes("Files")) return;
        e.preventDefault();
        dragCounterRef.current -= 1;
        if (dragCounterRef.current === 0) {
            setIsDragging(false);
        }
    }, []);

    const handleDragOver = useCallback((e: DragEvent) => {
        if (!e.dataTransfer?.types.includes("Files")) return;
        e.preventDefault();
    }, []);

    const handleDrop = useCallback(async (e: DragEvent) => {
        e.preventDefault();
        dragCounterRef.current = 0;
        setIsDragging(false);
        if (isUploading || collecting.current) {
            toaster.create({type: "info", title: "Wait for the current upload to finish before dropping more files."});
            return;
        }
        collecting.current = true;

        const items = e.dataTransfer?.items;
        const files: File[] = [];

        try {
        if (items) {
            for (const item of Array.from(items)) {
                if (item.kind === "file") {
                    const entry = item.webkitGetAsEntry?.();
                    if (entry?.isDirectory) {
                        await collectFilesFromDirectory(entry as FileSystemDirectoryEntry, files);
                    } else {
                        const file = item.getAsFile();
                        if (file && ACCEPTED_EXTENSIONS.test(file.name)) {
                            files.push(file);
                        }
                    }
                }
            }
        } else if (e.dataTransfer?.files) {
            for (const file of Array.from(e.dataTransfer.files)) {
                if (ACCEPTED_EXTENSIONS.test(file.name)) {
                    files.push(file);
                }
            }
        }

        if (files.length > 0) {
            await processFiles(files);
        } else {
            toaster.create({type: "info", title: "Drop EPUB or PDF files. Use Add books to upload MP3 or M4B audiobooks."});
        }
        } catch {
            toaster.create({type: "error", title: "This directory could not be read. Try selecting it with Add books."});
        } finally {
            collecting.current = false;
        }
    }, [isUploading, processFiles]);

    useEffect(() => {
        document.addEventListener("dragenter", handleDragEnter);
        document.addEventListener("dragleave", handleDragLeave);
        document.addEventListener("dragover", handleDragOver);
        document.addEventListener("drop", handleDrop);
        return () => {
            document.removeEventListener("dragenter", handleDragEnter);
            document.removeEventListener("dragleave", handleDragLeave);
            document.removeEventListener("dragover", handleDragOver);
            document.removeEventListener("drop", handleDrop);
        };
    }, [handleDragEnter, handleDragLeave, handleDragOver, handleDrop]);

    return (
        <>
            <UploadProgressDialog
                statuses={uploadStatuses}
                isOpen={isDialogOpen}
                isUploading={isUploading}
                onClose={closeDialog}
                onRetryFailed={retryFailed}
            />
            {isDragging && (
                <Box
                    role="status"
                    position="fixed"
                    inset={0}
                    zIndex="overlay"
                    bg="bg.panel"
                    opacity={0.95}
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    pointerEvents="none"
                >
                    <VStack
                        gap={4}
                        borderWidth="3px"
                        borderStyle="dashed"
                        borderColor="colorPalette.500"
                        borderRadius="2xl"
                        p={{base: 6, md: 16}}
                        mx={4}
                        textAlign="center"
                        colorPalette="orange"
                    >
                        <Icon as={LuUpload} boxSize={12} color="colorPalette.500"/>
                        <Text fontSize="2xl" fontWeight="bold" color="colorPalette.500">
                            Drop to upload
                        </Text>
                        <Text fontSize="md" color="fg.muted">
                            EPUB and PDF files are supported. For audiobooks, choose Add books.
                        </Text>
                    </VStack>
                </Box>
            )}
        </>
    );
}

async function collectFilesFromDirectory(
    dirEntry: FileSystemDirectoryEntry,
    files: File[],
): Promise<void> {
    const reader = dirEntry.createReader();
    const entries: FileSystemEntry[] = [];
    let batch: FileSystemEntry[];
    do {
        batch = await new Promise<FileSystemEntry[]>((resolve, reject) => reader.readEntries(resolve, reject));
        entries.push(...batch);
    } while (batch.length);

    for (const entry of entries) {
        if (entry.isDirectory) {
            await collectFilesFromDirectory(entry as FileSystemDirectoryEntry, files);
        } else if (entry.isFile) {
            const fileEntry = entry as FileSystemFileEntry;
            const file = await new Promise<File>((resolve, reject) => {
                fileEntry.file(resolve, reject);
            });
            if (ACCEPTED_EXTENSIONS.test(file.name)) {
                files.push(file);
            }
        }
    }
}
