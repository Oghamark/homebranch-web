import {Button, Card, Flex, Separator, Stack, Switch, Text} from "@chakra-ui/react";
import {useEffect, useState} from "react";
import {LuMail} from "react-icons/lu";
import TextField from "@/shared/ui/TextField";
import PasswordTextField from "@/shared/ui/PasswordTextField";
import ToastFactory from "@/shared/lib/toast/toast";
import {
    getApiErrorMessage,
    useGetMailConfigQuery,
    useSendTestMailMutation,
    useUpdateMailConfigMutation,
} from "@/entities/kindle/api/api";

export function MailSettingsCard() {
    const {data} = useGetMailConfigQuery();
    const [updateMailConfig, {isLoading: isSaving}] = useUpdateMailConfigMutation();
    const [sendTestMail, {isLoading: isSendingTest}] = useSendTestMailMutation();
    const [form, setForm] = useState({host: "", port: "587", secure: false, user: "", password: "", from: ""});
    const [testRecipient, setTestRecipient] = useState("");

    useEffect(() => {
        if (data?.smtp) {
            setForm({
                host: data.smtp.host,
                port: String(data.smtp.port),
                secure: data.smtp.secure,
                user: data.smtp.user ?? "",
                password: "",
                from: data.smtp.from,
            });
        }
    }, [data]);

    const handleSave = async () => {
        try {
            await updateMailConfig({
                host: form.host.trim(),
                port: Number(form.port),
                secure: form.secure,
                user: form.user.trim() || undefined,
                password: form.password || undefined,
                from: form.from.trim(),
            }).unwrap();
            ToastFactory({message: "Email settings saved", type: "success"});
        } catch (error) {
            ToastFactory({message: getApiErrorMessage(error), type: "error"});
        }
    };

    const handleTest = async () => {
        try {
            await sendTestMail(testRecipient.trim()).unwrap();
            ToastFactory({message: "Test email sent", type: "success"});
        } catch (error) {
            ToastFactory({message: getApiErrorMessage(error), type: "error"});
        }
    };

    return (
        <Card.Root>
            <Card.Header>
                <Flex align="center" gap={3}>
                    <LuMail/>
                    <Card.Title>Email (SMTP)</Card.Title>
                </Flex>
            </Card.Header>
            <Card.Body>
                <Stack gap={4}>
                    <Text fontSize="sm" color="fg.muted">
                        Used to send books to users' Kindle devices.
                    </Text>
                    <TextField label="SMTP host" placeholder="smtp.example.com" value={form.host}
                               onChange={e => setForm(prev => ({...prev, host: e.target.value}))}/>
                    <TextField label="Port" placeholder="587" value={form.port}
                               onChange={e => setForm(prev => ({...prev, port: e.target.value}))}/>
                    <Flex align="center" justify="space-between">
                        <Stack gap={0}>
                            <Text fontWeight="medium">Use TLS</Text>
                            <Text fontSize="sm" color="fg.muted">Enable for implicit TLS (usually port 465)</Text>
                        </Stack>
                        <Switch.Root checked={form.secure}
                                     onCheckedChange={({checked}) => setForm(prev => ({...prev, secure: checked}))}>
                            <Switch.HiddenInput/>
                            <Switch.Control><Switch.Thumb/></Switch.Control>
                        </Switch.Root>
                    </Flex>
                    <TextField label="Username" value={form.user}
                               onChange={e => setForm(prev => ({...prev, user: e.target.value}))}/>
                    <PasswordTextField
                        label="Password"
                        tooltip="Leave blank to keep the saved password"
                        placeholder={data?.smtp?.hasPassword ? "Saved" : ""}
                        value={form.password}
                        onChange={e => setForm(prev => ({...prev, password: e.target.value}))}
                    />
                    <TextField
                        label="From address"
                        tooltip="Users must approve this address in their Amazon account"
                        placeholder="homebranch@example.com"
                        value={form.from}
                        onChange={e => setForm(prev => ({...prev, from: e.target.value}))}
                    />
                    <Separator/>
                    <Flex gap={3} align="flex-end">
                        <TextField label="Send test email to" placeholder="you@example.com" value={testRecipient}
                                   onChange={e => setTestRecipient(e.target.value)}/>
                        <Button variant="outline" onClick={handleTest} loading={isSendingTest}
                                disabled={!data?.configured || !testRecipient.trim()}>
                            Send test
                        </Button>
                    </Flex>
                </Stack>
            </Card.Body>
            <Card.Footer justifyContent="flex-end">
                <Button onClick={handleSave} loading={isSaving}
                        disabled={!form.host.trim() || !form.from.trim() || !Number(form.port)}>
                    Save Email Settings
                </Button>
            </Card.Footer>
        </Card.Root>
    );
}
