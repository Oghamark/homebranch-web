import {Badge, Button, CloseButton, Dialog, HStack, Portal, Spinner, Text, VStack} from "@chakra-ui/react";
import type {FileUploadStatus} from "./AddBookButton";

interface UploadProgressDialogProps {
    statuses: FileUploadStatus[];
    isOpen: boolean;
    isUploading: boolean;
    onClose: () => void;
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
            return <Badge colorPalette="green">Success</Badge>;
        case "failed":
            return <Badge colorPalette="red">Failed</Badge>;
    }
}

export function UploadProgressDialog({statuses, isOpen, isUploading, onClose}: UploadProgressDialogProps) {
    const successCount = statuses.filter(s => s.status === "success").length;
    const failedCount = statuses.filter(s => s.status === "failed").length;

    return (
        <Dialog.Root open={isOpen} onOpenChange={({open}) => { if (!open && !isUploading) onClose(); }}>
            <Portal>
                <Dialog.Backdrop/>
                <Dialog.Positioner>
                    <Dialog.Content maxHeight="80vh">
                        <Dialog.Header>
                            <Dialog.Title>
                                {isUploading
                                    ? `Uploading ${statuses.length} book${statuses.length !== 1 ? "s" : ""}…`
                                    : "Upload Complete"}
                            </Dialog.Title>
                        </Dialog.Header>

                        <Dialog.Body overflowY="auto">
                            <VStack align="stretch" gap={2}>
                                {statuses.map((s, i) => (
                                    <VStack key={i} align="stretch" gap={0.5}>
                                        <HStack justify="space-between">
                                            <Text fontSize="sm" truncate maxW="70%">{s.name}</Text>
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
                                        <Text fontSize="sm" color="green.600">
                                            {successCount} book{successCount !== 1 ? "s" : ""} added successfully.
                                        </Text>
                                    )}
                                    {failedCount > 0 && (
                                        <Text fontSize="sm" color="red.600">
                                            {failedCount} book{failedCount !== 1 ? "s" : ""} failed to upload.
                                        </Text>
                                    )}
                                    <Button onClick={onClose} alignSelf="flex-end">Close</Button>
                                </VStack>
                            </Dialog.Footer>
                        )}

                        {!isUploading && (
                            <Dialog.CloseTrigger asChild>
                                <CloseButton/>
                            </Dialog.CloseTrigger>
                        )}
                    </Dialog.Content>
                </Dialog.Positioner>
            </Portal>
        </Dialog.Root>
    );
}
