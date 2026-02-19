import {Button, CloseButton, Dialog, IconButton, Loader, Portal,} from "@chakra-ui/react";
import {LuTrash2} from "react-icons/lu";
import {Tooltip} from "@/components/ui/tooltip";

interface DeleteConfirmationDialogProps<T> {
    title: string;
    loading: boolean;
    onSubmit: () => unknown;
    size?: "xs" | "sm" | "md" | "lg";
}

export function DeleteConfirmationDialog<T>({
                                                onSubmit,
                                                loading,
                                                title,
                                                size,
                                            }: DeleteConfirmationDialogProps<T>) {
    return (
        <Dialog.Root>
            <Tooltip content="Delete">
                <Dialog.Trigger asChild>
                    <IconButton variant={"subtle"} size={size}>
                        <LuTrash2/>
                    </IconButton>
                </Dialog.Trigger>
            </Tooltip>
            <Portal>
                <Dialog.Backdrop/>
                <Dialog.Positioner>
                    <Dialog.Content p={1} textAlign={"center"}>
                        <Dialog.Header>
                            <Dialog.Title>{title}</Dialog.Title>
                        </Dialog.Header>
                        <Dialog.Body>
                            Are you sure you want to delete this item?
                        </Dialog.Body>
                        <Dialog.Footer>
                            <Dialog.ActionTrigger asChild>
                                <Button variant="ghost">Cancel</Button>
                            </Dialog.ActionTrigger>
                            <Button variant={"subtle"} disabled={loading} onClick={onSubmit} color={"fg.error"}>
                                {loading ? <Loader/> : "Delete"}
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
