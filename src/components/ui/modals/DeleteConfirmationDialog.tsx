import {Button, CloseButton, Dialog, IconButton, Loader, Portal,} from "@chakra-ui/react";
import {HiTrash} from "react-icons/hi";

interface DeleteConfirmationDialogProps<T> {
    title: string;
    loading: boolean;
    onSubmit: () => unknown;
}

export function DeleteConfirmationDialog<T>({
                                                onSubmit,
                                                loading,
                                                title,
                                            }: DeleteConfirmationDialogProps<T>) {
    return (
        <Dialog.Root>
            <Dialog.Trigger asChild>
                <IconButton variant={"subtle"}>
                    <HiTrash/>
                </IconButton>
            </Dialog.Trigger>
            <Portal>
                <Dialog.Backdrop/>
                <Dialog.Positioner>
                    <Dialog.Content>
                        <Dialog.Header>
                            <Dialog.Title>{title}</Dialog.Title>
                        </Dialog.Header>
                        <Dialog.Body>
                            Are you sure you want to delete this item?
                        </Dialog.Body>
                        <Dialog.Footer>
                            <Dialog.ActionTrigger asChild>
                                <Button variant="outline">Cancel</Button>
                            </Dialog.ActionTrigger>
                            <Button disabled={loading} onClick={onSubmit}>
                                {loading ? <Loader/> : "Save"}
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
