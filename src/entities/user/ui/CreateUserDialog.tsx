import {Button, CloseButton, Dialog, Portal, Stack} from "@chakra-ui/react";
import {useState} from "react";
import {useCreateUserMutation} from "@/entities/user/api/api";
import type {CreateUserRequest} from "@/entities/user/api/dtos";
import TextField from "@/components/ui/TextField";
import {handleRtkError} from "@/shared/api/rtk-query";
import {toaster} from "@/components/ui/toaster";
import {LuUserPlus} from "react-icons/lu";

export function CreateUserDialog() {
    const [open, setOpen] = useState(false);
    const [createUser, {isLoading}] = useCreateUserMutation();
    const [form, setForm] = useState<CreateUserRequest>({name: '', email: '', password: '', password_confirmation: ''});

    function handleChange(field: keyof CreateUserRequest) {
        return (e: React.ChangeEvent<HTMLInputElement>) =>
            setForm(prev => ({...prev, [field]: e.target.value}));
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (form.password !== form.password_confirmation) {
            toaster.error({description: 'Passwords do not match'});
            return;
        }
        try {
            await createUser(form).unwrap();
            toaster.success({description: `User ${form.name} created successfully`});
            setOpen(false);
            setForm({name: '', email: '', password: '', password_confirmation: ''});
        } catch (error) {
            handleRtkError(error);
        }
    }

    return (
        <Dialog.Root open={open} onOpenChange={(e) => setOpen(e.open)}>
            <Dialog.Trigger asChild>
                <Button size="sm">
                    <LuUserPlus/> Add User
                </Button>
            </Dialog.Trigger>
            <Portal>
                <Dialog.Backdrop/>
                <Dialog.Positioner>
                    <Dialog.Content>
                        <Dialog.Header>
                            <Dialog.Title>Create User</Dialog.Title>
                        </Dialog.Header>
                        <form onSubmit={handleSubmit}>
                            <Dialog.Body>
                                <Stack gap={4}>
                                    <TextField
                                        label="Name"
                                        value={form.name}
                                        onChange={handleChange('name')}
                                        required
                                    />
                                    <TextField
                                        label="Email"
                                        type="email"
                                        value={form.email}
                                        onChange={handleChange('email')}
                                        required
                                    />
                                    <TextField
                                        label="Password"
                                        type="password"
                                        value={form.password}
                                        onChange={handleChange('password')}
                                        required
                                    />
                                    <TextField
                                        label="Confirm Password"
                                        type="password"
                                        value={form.password_confirmation}
                                        onChange={handleChange('password_confirmation')}
                                        required
                                    />
                                </Stack>
                            </Dialog.Body>
                            <Dialog.Footer>
                                <Dialog.ActionTrigger asChild>
                                    <Button variant="ghost" type="button">Cancel</Button>
                                </Dialog.ActionTrigger>
                                <Button type="submit" loading={isLoading}>Create</Button>
                            </Dialog.Footer>
                        </form>
                        <Dialog.CloseTrigger asChild>
                            <CloseButton/>
                        </Dialog.CloseTrigger>
                    </Dialog.Content>
                </Dialog.Positioner>
            </Portal>
        </Dialog.Root>
    );
}