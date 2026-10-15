import {Button, CloseButton, Dialog, Portal, Stack, Text} from "@chakra-ui/react";
import {useRef, useState} from "react";
import {useCreateUserMutation} from "@/entities/user/api/api";
import type {CreateUserRequest} from "@/entities/user/api/dtos";
import TextField from "@/shared/ui/TextField";
import PasswordTextField from "@/shared/ui/PasswordTextField";
import {toaster} from "@/shared/ui/toaster";
import {LuUserPlus} from "react-icons/lu";

export function CreateUserDialog() {
    const [open, setOpen] = useState(false);
    const [createUser, {isLoading}] = useCreateUserMutation();
    const [form, setForm] = useState<CreateUserRequest>({name: '', email: '', password: '', password_confirmation: ''});
    const [failure, setFailure] = useState("");
    const [mismatch, setMismatch] = useState(false);
    const [discarding, setDiscarding] = useState(false);
    const pending = useRef(false);

    function close() {
        if (pending.current) return;
        if (Object.values(form).some(Boolean)) setDiscarding(true);
        else setOpen(false);
    }

    function handleChange(field: keyof CreateUserRequest) {
        return (e: React.ChangeEvent<HTMLInputElement>) =>
            setForm(prev => ({...prev, [field]: e.target.value}));
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (pending.current) return;
        setFailure("");
        if (form.password !== form.password_confirmation) {
            setMismatch(true);
            return;
        }
        setMismatch(false);
        pending.current = true;
        try {
            await createUser({...form, name: form.name.trim(), email: form.email.trim()}).unwrap();
            toaster.success({description: `User ${form.name} created successfully`});
            setOpen(false);
            setForm({name: '', email: '', password: '', password_confirmation: ''});
        } catch {
            setFailure("The account could not be created. Check the email, password requirements, and your permissions, then try again.");
        } finally {
            pending.current = false;
        }
    }

    return (
        <Dialog.Root open={open} closeOnEscape={!isLoading} closeOnInteractOutside={!isLoading}
            onOpenChange={(e) => {if (e.open) {setOpen(true); setDiscarding(false);} else close();}}>
            <Dialog.Trigger asChild>
                <Button minH="44px">
                    <LuUserPlus/> Add user
                </Button>
            </Dialog.Trigger>
            <Portal>
                <Dialog.Backdrop/>
                <Dialog.Positioner p={4}>
                    <Dialog.Content aria-busy={isLoading}>
                        <Dialog.Header>
                            <Dialog.Title>Create user</Dialog.Title>
                        </Dialog.Header>
                        <form onSubmit={handleSubmit}>
                            <Dialog.Body>
                                <Stack gap={4}>
                                    {failure && <Text role="alert" color="fg.error">{failure}</Text>}
                                    {discarding && <Stack p={3} borderWidth="1px" borderRadius="md">
                                        <Text>Discard this new account draft?</Text>
                                        <Button type="button" minH="44px" variant="outline" onClick={() => setDiscarding(false)}>Keep editing</Button>
                                        <Button type="button" minH="44px" colorPalette="red" onClick={() => {
                                            setForm({name: "", email: "", password: "", password_confirmation: ""});
                                            setFailure(""); setMismatch(false); setDiscarding(false); setOpen(false);
                                        }}>Discard draft</Button>
                                    </Stack>}
                                    <TextField
                                        label="Name"
                                        value={form.name}
                                        onChange={handleChange('name')}
                                        required
                                        autoComplete="name"
                                        disabled={isLoading}
                                    />
                                    <TextField
                                        label="Email"
                                        type="email"
                                        value={form.email}
                                        onChange={handleChange('email')}
                                        required
                                        autoComplete="email"
                                        disabled={isLoading}
                                    />
                                    <PasswordTextField
                                        label="Password"
                                        value={form.password}
                                        onChange={handleChange('password')}
                                        required
                                        autoComplete="new-password"
                                        disabled={isLoading}
                                    />
                                    <PasswordTextField
                                        label="Confirm password"
                                        value={form.password_confirmation}
                                        onChange={handleChange('password_confirmation')}
                                        required
                                        autoComplete="new-password"
                                        disabled={isLoading}
                                        error={mismatch}
                                        errorText="Passwords do not match."
                                    />
                                </Stack>
                            </Dialog.Body>
                            <Dialog.Footer>
                                <Button minH="44px" variant="ghost" type="button" disabled={isLoading} onClick={close}>Cancel</Button>
                                <Button minH="44px" type="submit" loading={isLoading} disabled={isLoading || discarding}>Create user</Button>
                            </Dialog.Footer>
                        </form>
                        <Dialog.CloseTrigger asChild>
                            <CloseButton aria-label="Close create user" minH="44px" minW="44px" disabled={isLoading}/>
                        </Dialog.CloseTrigger>
                    </Dialog.Content>
                </Dialog.Positioner>
            </Portal>
        </Dialog.Root>
    );
}
