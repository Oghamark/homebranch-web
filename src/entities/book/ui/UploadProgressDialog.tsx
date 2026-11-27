import {Badge, Button, CloseButton, Dialog, Field, HStack, Input, Portal, Progress, Spinner, Text, VStack} from "@chakra-ui/react";
import {useEffect, useState} from "react";
import type {BookUploadMetadata, FileUploadStatus} from "./useBookUpload";

interface UploadProgressDialogProps {
    statuses: FileUploadStatus[];
    isOpen: boolean;
    isUploading: boolean;
    onClose: () => void;
    onRetryFailed?: () => Promise<unknown>;
    onRetryWithMetadata?: (index: number, metadata: BookUploadMetadata) => Promise<unknown>;
}

function StatusBadge({status, progress}: Pick<FileUploadStatus, "status" | "progress">) {
    switch (status) {
        case "pending":
            return <Badge colorPalette="gray">Pending</Badge>;
        case "uploading":
            return (
                <HStack gap={1}>
                    <Spinner size="xs"/>
                    <Badge colorPalette="blue">{progress === 100 ? "Processing" : `Uploading ${progress ?? 0}%`}</Badge>
                </HStack>
            );
        case "success":
            return <Badge colorPalette="green">Added</Badge>;
        case "skipped":
            return <Badge colorPalette="yellow">Already Exists</Badge>;
        case "failed":
            return <Badge colorPalette="red">Failed</Badge>;
    }
}

export function UploadProgressDialog({statuses, isOpen, isUploading, onClose, onRetryFailed, onRetryWithMetadata}: UploadProgressDialogProps) {
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [metadata, setMetadata] = useState<BookUploadMetadata>({});
    const editingStatus = editingIndex === null ? undefined : statuses[editingIndex];
    const hasEmptyRequiredField = editingStatus?.missingFields?.some(field => !metadata[field]?.trim());
    useEffect(() => {
        if (!isOpen || (editingIndex !== null && editingStatus?.status !== "failed")) setEditingIndex(null);
    }, [isOpen, editingIndex, editingStatus?.status]);
    const successCount = statuses.filter(s => s.status === "success").length;
    const skippedCount = statuses.filter(s => s.status === "skipped").length;
    const failedCount = statuses.filter(s => s.status === "failed").length;

    return (
        <>
        <Dialog.Root open={isOpen && editingIndex === null} closeOnEscape={!isUploading} closeOnInteractOutside={!isUploading}
            onOpenChange={({open}) => { if (!open && !isUploading && editingIndex === null) onClose(); }}>
            <Portal>
                <Dialog.Backdrop/>
                <Dialog.Positioner>
                    <Dialog.Content maxHeight="80vh">
                        <Dialog.Header>
                            <Dialog.Title>
                                {isUploading
                                    ? `Uploading ${statuses.length} book${statuses.length !== 1 ? "s" : ""}…`
                                    : failedCount ? "Upload needs attention" : "Upload complete"}
                            </Dialog.Title>
                        </Dialog.Header>

                        <Dialog.Body overflowY="auto">
                            <Progress.Root value={successCount + skippedCount + failedCount} max={statuses.length || 1} mb={4}>
                                <Progress.Label>Books processed</Progress.Label>
                                <Progress.Track><Progress.Range/></Progress.Track>
                                <Progress.ValueText/>
                            </Progress.Root>
                            <Text role="status" aria-live="polite" mb={3} fontSize="sm">
                                {successCount + skippedCount + failedCount} of {statuses.length} processed{isUploading ? ". Keep this window open while your books upload." : "."}
                            </Text>
                            <VStack align="stretch" gap={2}>
                                {statuses.map((s, i) => {
                                    const content = <>
                                        <HStack justify="space-between">
                                            <Text fontSize="sm" overflowWrap="anywhere" minW={0}>{s.name}</Text>
                                            <StatusBadge status={s.status} progress={s.progress}/>
                                        </HStack>
                                        {s.status === "uploading" && (
                                            <Progress.Root value={s.progress ?? 0} max={100} size="xs">
                                                <Progress.Track><Progress.Range/></Progress.Track>
                                                <Progress.Label fontSize="xs">
                                                    {s.progress === 100 ? "100% uploaded. Processing..." : `${s.progress ?? 0}% uploaded`}
                                                </Progress.Label>
                                            </Progress.Root>
                                        )}
                                        {s.status === "failed" && s.error && (
                                            <Text fontSize="xs" color="fg.error">{s.error}</Text>
                                        )}
                                    </>;
                                    return s.status === "failed" && onRetryWithMetadata ? (
                                        <Button key={i} variant="ghost" height="auto" minH="44px" py={2} whiteSpace="normal"
                                            display="flex" flexDirection="column" alignItems="stretch" gap={0.5} textAlign="left"
                                            disabled={isUploading} aria-label={`Edit metadata for ${s.name}`}
                                            onClick={() => {setMetadata({...s.metadata}); setEditingIndex(i);}}>
                                            {content}
                                            <Text fontSize="xs" color="fg.muted">Edit metadata and retry</Text>
                                        </Button>
                                    ) : <VStack key={i} align="stretch" gap={0.5}>{content}</VStack>;
                                })}
                            </VStack>
                        </Dialog.Body>

                        {!isUploading && (
                            <Dialog.Footer>
                                <VStack align="stretch" width="100%" gap={2}>
                                    {successCount > 0 && (
                                        <Text fontSize="sm" color="fg">
                                            {successCount} book{successCount !== 1 ? "s" : ""} added successfully.
                                        </Text>
                                    )}
                                    {skippedCount > 0 && (
                                        <Text fontSize="sm" color="fg">
                                            {skippedCount} book{skippedCount !== 1 ? "s" : ""} already exist{skippedCount === 1 ? "s" : ""} in the library.
                                        </Text>
                                    )}
                                    {failedCount > 0 && (
                                        <Text fontSize="sm" color="fg.error">
                                            {failedCount} book{failedCount !== 1 ? "s" : ""} failed to upload. Successfully added books are kept.
                                        </Text>
                                    )}
                                    {failedCount > 0 && onRetryFailed && <Button minH="44px" variant="outline" onClick={() => void onRetryFailed()}>Retry failed uploads</Button>}
                                    <Button minH="44px" onClick={onClose} alignSelf="flex-end">Close</Button>
                                </VStack>
                            </Dialog.Footer>
                        )}

                        {!isUploading && (
                            <Dialog.CloseTrigger asChild>
                                <CloseButton aria-label="Close upload results" minH="44px" minW="44px"/>
                            </Dialog.CloseTrigger>
                        )}
                    </Dialog.Content>
                </Dialog.Positioner>
            </Portal>
        </Dialog.Root>
        <Dialog.Root open={isOpen && editingIndex !== null} onOpenChange={({open}) => {if (!open) setEditingIndex(null);}}>
            <Portal>
                <Dialog.Backdrop/>
                <Dialog.Positioner>
                    <Dialog.Content maxHeight="80vh" overflowY="auto">
                        <form onSubmit={event => {
                            event.preventDefault();
                            if (editingIndex === null || !onRetryWithMetadata || isUploading || hasEmptyRequiredField) return;
                            const index = editingIndex;
                            setEditingIndex(null);
                            void onRetryWithMetadata(index, metadata);
                        }}>
                            <Dialog.Header><Dialog.Title>Complete book metadata</Dialog.Title></Dialog.Header>
                            <Dialog.Body>
                                <VStack align="stretch" gap={4}>
                                    <Text overflowWrap="anywhere">{editingStatus?.name}</Text>
                                    {editingStatus?.error && <Text fontSize="sm" color="fg.error">{editingStatus.error}</Text>}
                                    <Text fontSize="sm">Fill in missing metadata, then retry this upload. Existing metadata is kept when a field is left blank.</Text>
                                    {(["title", "author"] as const).map(field => (
                                        <Field.Root key={field} required={editingStatus?.missingFields?.includes(field)}>
                                            <Field.Label>{field === "title" ? "Title" : "Author"}<Field.RequiredIndicator/></Field.Label>
                                            <Input value={metadata[field] ?? ""} required={editingStatus?.missingFields?.includes(field)}
                                                onChange={event => setMetadata(previous => ({...previous, [field]: event.target.value}))}/>
                                        </Field.Root>
                                    ))}
                                </VStack>
                            </Dialog.Body>
                            <Dialog.Footer>
                                <Button minH="44px" variant="outline" type="button" onClick={() => setEditingIndex(null)}>Cancel</Button>
                                <Button minH="44px" type="submit" disabled={isUploading || hasEmptyRequiredField}>Save and retry</Button>
                            </Dialog.Footer>
                        </form>
                        <Dialog.CloseTrigger asChild><CloseButton aria-label="Close metadata editor" minH="44px" minW="44px"/></Dialog.CloseTrigger>
                    </Dialog.Content>
                </Dialog.Positioner>
            </Portal>
        </Dialog.Root>
        </>
    );
}
