import {Box, Button, Separator, Stack, Switch, Text, chakra} from "@chakra-ui/react";
import {useMemo, useState} from "react";
import {useGetAuthConfigQuery, useUpdateAuthConfigMutation} from "@/entities/authConfig";
import type {AuthConfig} from "@/entities/authConfig/api/api";
import {ErrorState, LoadingState, PageSection} from "@/shared/ui/EditorialUI";
import TextField from "@/shared/ui/TextField";
import PasswordTextField from "@/shared/ui/PasswordTextField";
import {useSettingsDraft} from "./useSettingsDraft";

const groups = {
    oidc: {
        title: "Single sign-on (OIDC)", enabled: "oidcEnabled", secret: "oidcClientSecret",
        fields: [
            ["oidcProviderName", "Provider name", "Name shown on the sign-in page."],
            ["oidcIssuerUrl", "Issuer URL", "Your provider's realm or tenant URL."],
            ["oidcClientId", "Client ID", "Client identifier registered with your identity provider."],
            ["oidcClientSecret", "Client secret", "Leave blank to keep the saved secret."],
            ["oidcCallbackUrl", "Callback URL", "Register your frontend host followed by /auth/login/oidc/callback with your provider."],
        ],
    },
    ldap: {
        title: "Directory sign-in (LDAP)", enabled: "ldapEnabled", secret: "ldapBindPassword",
        fields: [
            ["ldapServerUrl", "Server URL", "LDAP server URL and port reachable by the Authentication API."],
            ["ldapBaseDn", "Base DN", "Directory location to search for users."],
            ["ldapBindDn", "Bind DN", "Service account used to search the directory."],
            ["ldapBindPassword", "Bind password", "Leave blank to keep the saved password."],
            ["ldapAdminGroup", "Admins group", "Members become administrators on their first sign-in."],
            ["ldapUserGroup", "Users group", "Users must belong to this group to sign in."],
            ["ldapEmailField", "Email field", "Directory field containing the email address, for example mail."],
            ["ldapNameField", "Name field", "Directory field containing the display name, for example sn."],
        ],
    },
} as const;

type Provider = keyof typeof groups;
type Form = Record<string, string | boolean>;

export function integrationPatch(provider: Provider, form: Form): Partial<AuthConfig> {
    const group = groups[provider];
    const patch: Record<string, string | boolean | null> = {[group.enabled]: form[group.enabled]};
    for (const [key] of group.fields) {
        if (key === group.secret && !form[key]) continue;
        patch[key] = form[key] || null;
    }
    return patch;
}

function message(error: unknown) {
    const failure = error as {data?: unknown};
    return typeof failure?.data === "string" ? failure.data : "Settings could not be saved. Please try again.";
}

function IntegrationForm({provider, config}: {provider: Provider; config: AuthConfig}) {
    const group = groups[provider];
    const [update, {isLoading}] = useUpdateAuthConfigMutation();
    const incoming = useMemo(() => {
        const value: Form = {[group.enabled]: config[group.enabled]};
        for (const [key] of group.fields) value[key] = key === group.secret ? "" : config[key] ?? "";
        return value;
    }, [config, group]);
    const draft = useSettingsDraft(incoming, incoming);
    const [error, setError] = useState("");
    const [saved, setSaved] = useState(false);
    return <PageSection title={group.title} description="Changes affect how users sign in. Verify the provider configuration before enabling it.">
        <Box as="form" onSubmit={async event => {
            event.preventDefault(); setError(""); setSaved(false);
            try {
                await update(integrationPatch(provider, draft.value)).unwrap();
                draft.accept({...draft.value, [group.secret]: ""});
                setSaved(true);
            } catch (failure) {setError(message(failure));}
        }}>
            <Stack gap={4}>
                <chakra.fieldset border="0" p={0} minW={0} disabled={isLoading}>
                    <Stack gap={4}>
                        <Switch.Root checked={Boolean(draft.value[group.enabled])} onCheckedChange={({checked}) => {
                            draft.setValue(previous => ({...previous, [group.enabled]: checked})); setSaved(false);
                        }}>
                            <Switch.HiddenInput/><Switch.Control><Switch.Thumb/></Switch.Control>
                            <Switch.Label>Enable {provider.toUpperCase()}</Switch.Label>
                        </Switch.Root>
                        {group.fields.map(([key, label, tooltip]) => {
                            const Field = key === group.secret ? PasswordTextField : TextField;
                            return <Field key={key} label={label} tooltip={tooltip} autoComplete={key === group.secret ? "new-password" : "off"}
                                value={String(draft.value[key] ?? "")} onChange={event => {
                                    draft.setValue(previous => ({...previous, [key]: event.target.value})); setSaved(false);
                                }}/>;
                        })}
                        <Text fontSize="sm" color="fg.muted">Secret fields are never filled from saved configuration. Leave them blank to keep existing credentials.</Text>
                    </Stack>
                </chakra.fieldset>
                {error && <Text role="alert" color="fg.error">{error}</Text>}
                {saved && <Text role="status">{provider.toUpperCase()} settings saved.</Text>}
                <Button type="submit" minH="44px" colorPalette="orange" alignSelf="start" loading={isLoading}
                    loadingText={`Save ${provider.toUpperCase()} settings`} disabled={!draft.dirty || isLoading}>Save {provider.toUpperCase()} settings</Button>
            </Stack>
        </Box>
    </PageSection>;
}

export function SignInSettings() {
    const query = useGetAuthConfigQuery();
    if (query.isLoading) return <LoadingState label="Loading sign-in settings..."/>;
    if (!query.data) return <ErrorState onRetry={query.refetch}>Sign-in settings could not be loaded.</ErrorState>;
    return <Stack gap={8}>
        {query.isError && <ErrorState onRetry={query.refetch}>Saved configuration could not be refreshed. Your drafts are unchanged.</ErrorState>}
        <IntegrationForm provider="oidc" config={query.data}/>
        <Separator/>
        <IntegrationForm provider="ldap" config={query.data}/>
    </Stack>;
}

export function RegistrationSettings() {
    const query = useGetAuthConfigQuery();
    const [update, {isLoading}] = useUpdateAuthConfigMutation();
    const [error, setError] = useState("");
    const [saved, setSaved] = useState(false);
    if (query.isLoading) return <LoadingState label="Loading registration settings..."/>;
    if (!query.data || query.isError) return <ErrorState onRetry={query.refetch}>Registration settings could not be loaded.</ErrorState>;
    return <PageSection title="Registration" description="Choose whether new users can create their own accounts on this server.">
        <Switch.Root checked={query.data.signupEnabled} disabled={isLoading} onCheckedChange={async ({checked}) => {
            setError(""); setSaved(false);
            try {await update({signupEnabled: checked}).unwrap(); setSaved(true);}
            catch (failure) {setError(message(failure));}
        }}>
            <Switch.HiddenInput/><Switch.Control><Switch.Thumb/></Switch.Control><Switch.Label>Allow sign up</Switch.Label>
        </Switch.Root>
        {isLoading && <Text role="status">Saving registration setting...</Text>}
        {error && <Text role="alert" color="fg.error">{error}</Text>}
        {saved && <Text role="status">Registration setting saved.</Text>}
    </PageSection>;
}
