import {Button, CloseButton, Dialog, Flex, Portal, Text} from "@chakra-ui/react";

export type ModalCase =
    | {type: "jump"; deviceName: string; updatedAt: string; serverPosition: string; serverLabel: string}
    | {type: "conflict"; serverPosition: string; localPosition: string; serverLabel: string; localLabel: string};

interface JumpToSavedPositionModalProps {
    modalCase: ModalCase;
    open: boolean;
    onJump: (position: string) => void;
    onKeepLocal: () => void;
    onClose: () => void;
}

export function JumpToSavedPositionModal({
    modalCase,
    open,
    onJump,
    onKeepLocal,
    onClose,
}: JumpToSavedPositionModalProps) {
    if (modalCase.type === "jump") {
        const date = new Date(modalCase.updatedAt).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
        });

        return (
            <Dialog.Root open={open} onOpenChange={({open: isOpen}) => !isOpen && onClose()}>
                <Portal>
                    <Dialog.Backdrop/>
                    <Dialog.Positioner>
                        <Dialog.Content p={1} textAlign="center">
                            <Dialog.Header>
                                <Dialog.Title>Jump to Saved Position?</Dialog.Title>
                            </Dialog.Header>
                            <Dialog.Body>
                                <Text>
                                    You were reading on <strong>{modalCase.deviceName}</strong> on {date}.
                                </Text>
                                <Text mt={2} fontSize="sm" fontWeight="medium">
                                    {modalCase.serverLabel}
                                </Text>
                                <Text mt={2} fontSize="sm" color="fg.muted">
                                    Would you like to continue from where you left off?
                                </Text>
                            </Dialog.Body>
                            <Dialog.Footer>
                                <Button variant="ghost" onClick={onClose}>
                                    Ignore
                                </Button>
                                <Button
                                    colorPalette="blue"
                                    onClick={() => onJump(modalCase.serverPosition)}
                                >
                                    Jump
                                </Button>
                            </Dialog.Footer>
                            <Dialog.CloseTrigger asChild>
                                <CloseButton/>
                            </Dialog.CloseTrigger>
                        </Dialog.Content>
                    </Dialog.Positioner>
                </Portal>
            </Dialog.Root>
        );
    }

    return (
        <Dialog.Root open={open} onOpenChange={({open: isOpen}) => !isOpen && onClose()}>
            <Portal>
                <Dialog.Backdrop/>
                <Dialog.Positioner>
                    <Dialog.Content p={1} textAlign="center">
                        <Dialog.Header>
                            <Dialog.Title>Page Persistence Desynchronized</Dialog.Title>
                        </Dialog.Header>
                        <Dialog.Body>
                            <Flex gap={4} justify="center" wrap="wrap">
                                <Flex
                                    direction="column"
                                    p={3}
                                    borderWidth="1px"
                                    borderRadius="md"
                                    flex="1"
                                    minW="120px"
                                >
                                    <Text fontWeight="bold" fontSize="sm">Cloud</Text>
                                    <Text fontSize="xs" color="fg.muted" mt={1}>
                                        {modalCase.serverLabel}
                                    </Text>
                                </Flex>
                                <Flex
                                    direction="column"
                                    p={3}
                                    borderWidth="1px"
                                    borderRadius="md"
                                    flex="1"
                                    minW="120px"
                                >
                                    <Text fontWeight="bold" fontSize="sm">Local</Text>
                                    <Text fontSize="xs" color="fg.muted" mt={1}>
                                        {modalCase.localLabel}
                                    </Text>
                                </Flex>
                            </Flex>
                            <Text mt={3} fontSize="sm" color="fg.muted">
                                Your cloud and local reading positions are different. Which would you like to keep?
                            </Text>
                        </Dialog.Body>
                        <Dialog.Footer>
                            <Button variant="ghost" onClick={onKeepLocal}>
                                Local
                            </Button>
                            <Button
                                colorPalette="blue"
                                onClick={() => onJump(modalCase.serverPosition)}
                            >
                                Cloud
                            </Button>
                        </Dialog.Footer>
                        <Dialog.CloseTrigger asChild>
                            <CloseButton/>
                        </Dialog.CloseTrigger>
                    </Dialog.Content>
                </Dialog.Positioner>
            </Portal>
        </Dialog.Root>
    );
}
