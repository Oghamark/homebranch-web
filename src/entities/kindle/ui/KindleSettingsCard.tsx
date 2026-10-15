import {Box, Button, Stack, Text, chakra} from "@chakra-ui/react";
import {useMemo, useState} from "react";
import TextField from "@/shared/ui/TextField";
import {EmptyState, ErrorState, LoadingState, PageSection} from "@/shared/ui/EditorialUI";
import {useSettingsDraft} from "@/features/settings/useSettingsDraft";
import {getApiErrorMessage, useGetKindleEmailQuery, useGetMailSenderQuery, useUpdateKindleEmailMutation} from "@/entities/kindle/api/api";

export function KindleSettingsCard() {
    const query = useGetKindleEmailQuery();
    const senderQuery = useGetMailSenderQuery();
    const [update, {isLoading}] = useUpdateKindleEmailMutation();
    const incoming = useMemo(() => query.data ? {email: query.data.kindleEmail ?? ""} : undefined, [query.data]);
    const draft = useSettingsDraft(incoming, {email: ""});
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    if (query.isLoading || senderQuery.isLoading) return <LoadingState label="Loading Kindle settings..."/>;
    const retry = () => {void query.refetch(); void senderQuery.refetch();};
    if ((query.isError && !query.data) || (senderQuery.isError && !senderQuery.data)) return <ErrorState onRetry={retry}>Kindle settings could not be loaded.</ErrorState>;
    if (!senderQuery.data?.configured) return <EmptyState title="Send to Kindle is not configured">An administrator needs to configure email delivery before you can add your Kindle address.</EmptyState>;
    return <PageSection title="Send to Kindle" description="Send EPUB books to your Kindle using your personal document email address.">
        {(query.isError || senderQuery.isError) && <ErrorState onRetry={retry}>The latest settings could not be refreshed. Your draft is unchanged.</ErrorState>}
        <Box as="form" onSubmit={async event => {
            event.preventDefault();
            setError(""); setSuccess("");
            const email = draft.value.email.trim();
            try {
                await update(email || null).unwrap();
                draft.accept({email});
                setSuccess("Kindle email saved.");
            } catch (failure) {setError(getApiErrorMessage(failure));}
        }}>
            <Stack gap={4}>
                <chakra.fieldset disabled={isLoading} border="0" p={0} minW={0}>
                    <TextField label="Kindle email address" type="email" autoComplete="email" value={draft.value.email}
                        tooltip="Find this in Amazon under Content & Devices, Preferences, Personal Document Settings."
                        onChange={event => {draft.setValue({email: event.target.value}); setSuccess("");}}/>
                </chakra.fieldset>
                <Text color="fg.muted">Add {senderQuery.data.sender} to your Approved Personal Document E-mail List in Amazon. Leave your Kindle address blank to remove it.</Text>
                {error && <Text role="alert" color="fg.error">{error}</Text>}
                {success && <Text role="status">{success}</Text>}
                <Button type="submit" minH="44px" colorPalette="orange" alignSelf="start" loading={isLoading}
                    loadingText="Save Kindle email" disabled={!draft.dirty || isLoading}>Save Kindle email</Button>
            </Stack>
        </Box>
    </PageSection>;
}
