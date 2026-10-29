import {Box, Button, Flex, Separator, Stack, Switch, Text, chakra} from "@chakra-ui/react";
import {useMemo, useState} from "react";
import TextField from "@/shared/ui/TextField";
import PasswordTextField from "@/shared/ui/PasswordTextField";
import {ErrorState, LoadingState, PageSection} from "@/shared/ui/EditorialUI";
import {useSettingsDraft} from "@/features/settings/useSettingsDraft";
import {getApiErrorMessage, useGetMailConfigQuery, useSendTestMailMutation, useUpdateMailConfigMutation} from "@/entities/kindle/api/api";

const empty = {host: "", port: "587", secure: false, user: "", password: "", from: ""};

export function MailSettingsCard() {
    const query = useGetMailConfigQuery();
    const [update, {isLoading: saving}] = useUpdateMailConfigMutation();
    const [sendTest, {isLoading: sending}] = useSendTestMailMutation();
    const incoming = useMemo(() => query.data ? query.data.smtp ? {
        host: query.data.smtp.host, secure: query.data.smtp.secure, from: query.data.smtp.from,
        port: String(query.data.smtp.port), user: query.data.smtp.user ?? "", password: "",
    } : empty : undefined, [query.data]);
    const draft = useSettingsDraft(incoming, empty);
    const {value: form, setValue: setForm} = draft;
    const [recipient, setRecipient] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [testError, setTestError] = useState("");
    const [testSuccess, setTestSuccess] = useState("");
    const portValid = /^\d+$/.test(form.port) && Number(form.port) >= 1 && Number(form.port) <= 65535;
    const change = (key: keyof typeof empty, value: string | boolean) => {
        setForm(previous => ({...previous, [key]: value})); setSuccess("");
    };
    if (query.isLoading) return <LoadingState label="Loading email settings..."/>;
    if (query.isError && !query.data) return <ErrorState onRetry={query.refetch}>Email settings could not be loaded.</ErrorState>;
    return <PageSection title="Email delivery (SMTP)" description="Configure the server used to send books to Kindle devices.">
        {query.isError && <ErrorState onRetry={query.refetch}>The latest settings could not be refreshed. Your draft is unchanged.</ErrorState>}
        <Box as="form" onSubmit={async event => {
            event.preventDefault(); setError(""); setSuccess("");
            if (!portValid) {setError("Enter a port between 1 and 65535."); return;}
            const submitted = {...form, host: form.host.trim(), user: form.user.trim(), from: form.from.trim()};
            try {
                await update({...submitted, port: Number(form.port), user: submitted.user || undefined,
                    password: submitted.password || undefined}).unwrap();
                draft.accept({...submitted, password: ""});
                setSuccess("Email settings saved.");
            } catch (failure) {setError(getApiErrorMessage(failure));}
        }}>
            <Stack gap={4}>
                <chakra.fieldset disabled={saving || sending} border="0" p={0} minW={0}>
                    <Stack gap={4}>
                        <TextField label="SMTP host" required value={form.host} onChange={event => change("host", event.target.value)}/>
                        <TextField label="Port" required inputMode="numeric" value={form.port} error={!portValid}
                            errorText="Enter a port between 1 and 65535." onChange={event => change("port", event.target.value)}/>
                        <Switch.Root checked={form.secure} onCheckedChange={({checked}) => change("secure", checked)}>
                            <Switch.HiddenInput/><Switch.Control><Switch.Thumb/></Switch.Control>
                            <Switch.Label>Use implicit TLS (usually port 465)</Switch.Label>
                        </Switch.Root>
                        <TextField label="Username" autoComplete="off" value={form.user} onChange={event => change("user", event.target.value)}/>
                        <PasswordTextField label="Password" autoComplete="new-password" value={form.password}
                            tooltip="Leave blank to keep the saved password." placeholder={query.data?.smtp?.hasPassword ? "Saved password unchanged" : ""}
                            onChange={event => change("password", event.target.value)}/>
                        <Text color="fg.muted" fontSize="sm">{query.data?.smtp?.hasPassword ? "A password is saved. " : ""}Leaving this field blank keeps the saved password.</Text>
                        <TextField label="From address" type="email" required value={form.from}
                            tooltip="Users must approve this address in their Amazon account." onChange={event => change("from", event.target.value)}/>
                    </Stack>
                </chakra.fieldset>
                {error && <Text role="alert" color="fg.error">{error}</Text>}
                {success && <Text role="status">{success}</Text>}
                <Button type="submit" minH="44px" colorPalette="orange" alignSelf="start" loading={saving}
                    loadingText="Save email settings" disabled={!draft.dirty || !portValid || saving || sending}>Save email settings</Button>
            </Stack>
        </Box>
        <Separator/>
        <Box as="form" onSubmit={async event => {
            event.preventDefault(); setTestError(""); setTestSuccess("");
            try {await sendTest(recipient.trim()).unwrap(); setTestSuccess("Test email sent.");}
            catch (failure) {setTestError(getApiErrorMessage(failure));}
        }}>
            <Stack gap={3}>
                <Text color="fg.muted">Test uses the saved configuration. Save any changes first.</Text>
                <Flex gap={3} align="end" wrap="wrap">
                    <Box flex="1" minW="180px"><TextField label="Send test email to" type="email" required value={recipient}
                        disabled={sending} onChange={event => setRecipient(event.target.value)}/></Box>
                    <Button type="submit" minH="44px" variant="outline" loading={sending} loadingText="Send test email"
                        disabled={!query.data?.configured || !recipient.trim() || draft.dirty || saving || sending}>Send test</Button>
                </Flex>
                {testError && <Text role="alert" color="fg.error">{testError}</Text>}
                {testSuccess && <Text role="status">{testSuccess}</Text>}
            </Stack>
        </Box>
    </PageSection>;
}
