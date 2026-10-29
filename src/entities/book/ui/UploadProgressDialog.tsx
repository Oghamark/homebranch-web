import {Badge, Button, CloseButton, Dialog, HStack, Portal, Progress, Spinner, Text, VStack} from "@chakra-ui/react";
import type {FileUploadStatus} from "./useBookUpload";

interface UploadProgressDialogProps {
    statuses: FileUploadStatus[];
    isOpen: boolean;
    isUploading: boolean;
    onClose: () => void;
    onRetryFailed?: () => Promise<unknown>;
}

function StatusBadge({status}: { status: FileUploadStatus["status"] }) {
    switch (status) {
        case "pending":
            return <Badge colorPalette="gray">Pending</Badge>;
        case "uploading":
            return (
                <HStack gap={1}>
                    <Spinner size="xs"/>
                    <Badge colorPalette="blue">Uploading</Badge>
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

export function UploadProgressDialog({statuses, isOpen, isUploading, onClose, onRetryFailed}: UploadProgressDialogProps) {
    const successCount = statuses.filter(s => s.status === "success").length;
    const skippedCount = statuses.filter(s => s.status === "skipped").length;
    const failedCount = statuses.filter(s => s.status === "failed").length;

    return (
        <Dialog.Root open={isOpen} closeOnEscape={!isUploading} closeOnInteractOutside={!isUploading}
            onOpenChange={({open}) => { if (!open && !isUploading) onClose(); }}>
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
                                {statuses.map((s, i) => (
                                    <VStack key={i} align="stretch" gap={0.5}>
                                        <HStack justify="space-between">
                                            <Text fontSize="sm" overflowWrap="anywhere" minW={0}>{s.name}</Text>
                                            <StatusBadge status={s.status}/>
                                        </HStack>
                                        {s.status === "failed" && s.error && (
                                            <Text fontSize="xs" color="fg.error">{s.error}</Text>
                                        )}
                                    </VStack>
                                ))}
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
    );
}
