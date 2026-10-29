import {useEffect, useRef, useState} from "react";
import {Box, Button, HStack, Separator, Stack, Text} from "@chakra-ui/react";
import {Link, useFetcher} from "react-router";
import TextField from "@/shared/ui/TextField";
import PasswordTextField from "@/shared/ui/PasswordTextField";
import {ErrorState} from "@/shared/ui/EditorialUI";
import {config} from "@/shared";
import {type AuthFormResult, validateAuthForm} from "../api/formFeedback";

export function AuthForm({signup = false, oidcEnabled, oidcProviderName, notice}: {
    signup?: boolean; oidcEnabled: boolean; oidcProviderName: string | null; notice?: string | null;
}) {
    const fetcher = useFetcher<AuthFormResult>();
    const [validation, setValidation] = useState<AuthFormResult>({});
    const [providerPending, setProviderPending] = useState(false);
    const submitting = useRef(false);
    const busy = fetcher.state !== "idle";
    const errors = validation.fieldErrors ?? fetcher.data?.fieldErrors ?? {};
    useEffect(() => {
        if (!busy) submitting.current = false;
    }, [busy]);

    return <Stack gap={5}>
        {notice && <ErrorState>{notice}</ErrorState>}
        {oidcEnabled && <>
            <Stack gap={2}>
                <Button variant="outline" minH="44px" disabled={busy || providerPending} loading={providerPending}
                    onClick={() => {
                        if (submitting.current || providerPending) return;
                        setProviderPending(true);
                        window.location.href = `${config.authenticationUrl}/login/oidc?returnTo=/oidc-callback`;
                    }}>Continue with {oidcProviderName || "OIDC"}</Button>
                <Text color="fg.muted" fontSize="sm">Use your {oidcProviderName || "identity provider"} account. You'll return here after signing in.</Text>
            </Stack>
            <HStack gap={3}><Separator flex={1}/><Text fontSize="sm" color="fg.muted">or use email</Text><Separator flex={1}/></HStack>
        </>}
        <fetcher.Form method="post" noValidate aria-busy={busy} onSubmit={event => {
            if (submitting.current || busy || providerPending) {event.preventDefault(); return;}
            const next = validateAuthForm(new FormData(event.currentTarget), signup);
            setValidation(next);
            if (next.fieldErrors) {
                event.preventDefault();
                const field = event.currentTarget.elements.namedItem(Object.keys(next.fieldErrors)[0]);
                if (field instanceof HTMLElement) field.focus();
                return;
            }
            submitting.current = true;
        }}>
            <Stack gap={4}>
                {fetcher.data?.error && <ErrorState>{fetcher.data.error}</ErrorState>}
                {signup && <TextField label="Name" name="name" required autoComplete="name" minH="44px" error={!!errors.name} errorText={errors.name}/>}
                <TextField label="Email" name="email" type="email" required autoComplete="username" autoCapitalize="none" spellCheck={false}
                    minH="44px" error={!!errors.email} errorText={errors.email}/>
                <PasswordTextField name="password" label="Password" required autoComplete={signup ? "new-password" : "current-password"}
                    error={!!errors.password} errorText={errors.password}/>
                {signup && <PasswordTextField name="password_confirmation" label="Confirm password" required autoComplete="new-password"
                    error={!!errors.password_confirmation} errorText={errors.password_confirmation}/>}
                <Button type="submit" colorPalette="orange" minH="44px" w="full" loading={busy} disabled={busy || providerPending}>
                    {signup ? "Create account" : "Sign in"}
                </Button>
                {busy && <Text role="status" color="fg.muted" fontSize="sm">{signup ? "Creating your account..." : "Signing you in..."}</Text>}
            </Stack>
        </fetcher.Form>
        <Box fontSize="sm" color="fg.muted">
            {signup ? <Text>Already have an account? <Link to="/login" style={{fontWeight: "bold", textDecoration: "underline"}}>Sign in</Link></Text>
                : config.cloudMode ? <Stack gap={2}>
                    <Text>HomeBranch Cloud accounts and subscriptions are managed on our website.</Text>
                    {config.portalUrl && <a href={`${config.portalUrl}/cloud/signup`} style={{fontWeight: "bold", textDecoration: "underline"}}>Create a Cloud account</a>}
                    {config.portalUrl && <a href={config.portalUrl} style={{fontWeight: "bold", textDecoration: "underline"}}>Manage your account and subscription</a>}
                </Stack>
                : config.signupEnabled ? <Text>New to HomeBranch? <Link to="/sign-up" style={{fontWeight: "bold", textDecoration: "underline"}}>Create an account</Link></Text>
                    : <Text>Need an account? Contact the person who manages this library.</Text>}
        </Box>
    </Stack>;
}
