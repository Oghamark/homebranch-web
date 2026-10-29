import {Button, CloseButton, Dialog, IconButton, Portal, Stack, Text} from "@chakra-ui/react";
import {LuTrash2} from "react-icons/lu";
import {Tooltip} from "@/shared/ui/tooltip";
import {useRef, useState} from "react";

interface DeleteConfirmationDialogProps {
    title: string;
    loading: boolean;
    onSubmit: () => unknown;
    size?: "xs" | "sm" | "md" | "lg";
    description?: string;
}

export function DeleteConfirmationDialog({
                                                onSubmit,
                                                loading,
                                                title,
                                                size,
                                                description = "This deletion can't be undone.",
                                            }: DeleteConfirmationDialogProps) {
    const [open, setOpen] = useState(false);
    const [pending, setPending] = useState(false);
    const [failed, setFailed] = useState(false);
    const submitting = useRef(false);
    const cancelRef = useRef<HTMLButtonElement>(null);
    const busy = pending || loading;

    async function handleSubmit() {
        if (submitting.current || loading) return;
        submitting.current = true;
        setPending(true);
        setFailed(false);
        try {
            if (await onSubmit() === false) setFailed(true);
            else setOpen(false);
        } catch {
            setFailed(true);
        } finally {
            submitting.current = false;
            setPending(false);
        }
    }

    return (
        <Dialog.Root open={open} role="alertdialog" initialFocusEl={() => cancelRef.current}
            closeOnEscape={!busy} closeOnInteractOutside={!busy}
            onOpenChange={(e) => {if (!submitting.current && !loading) {setOpen(e.open); setFailed(false);}}}>
            <Tooltip content="Delete">
                <Dialog.Trigger asChild>
                    <IconButton aria-label={title} variant="outline" colorPalette="red" minH="44px" minW="44px" size={size} disabled={busy}>
                        <LuTrash2/>
                    </IconButton>
                </Dialog.Trigger>
            </Tooltip>
            <Portal>
                <Dialog.Backdrop/>
                <Dialog.Positioner p={4}>
                    <Dialog.Content maxW="480px" aria-busy={busy}>
                        <Dialog.Header>
                            <Dialog.Title>{title}</Dialog.Title>
                        </Dialog.Header>
                        <Dialog.Body>
                            <Stack gap={3}>
                                <Dialog.Description>{description}</Dialog.Description>
                                {failed && <Text role="alert" color="fg.error">The item couldn't be deleted. Please try again.</Text>}
                            </Stack>
                        </Dialog.Body>
                        <Dialog.Footer>
                            <Dialog.ActionTrigger asChild>
                                <Button ref={cancelRef} variant="ghost" minH="44px" disabled={busy}>Cancel</Button>
                            </Dialog.ActionTrigger>
                            <Button colorPalette="red" minH="44px" loading={busy} loadingText="Delete" disabled={busy} onClick={handleSubmit}>
                                Delete
                            </Button>
                        </Dialog.Footer>
                        <Dialog.CloseTrigger asChild>
                            <CloseButton aria-label="Close confirmation" minH="44px" minW="44px" disabled={busy}/>
                        </Dialog.CloseTrigger>
                    </Dialog.Content>
                </Dialog.Positioner>
            </Portal>
        </Dialog.Root>
    );
}
