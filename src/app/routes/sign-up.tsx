import type {Route} from "./+types/sign-up";

import TextField from "@/shared/ui/TextField";
import {Box, Button, Card, Center, Separator, Stack, Text} from "@chakra-ui/react";
import {Link, redirect, useFetcher} from "react-router";
import signUp from "@/features/authentication/api/signUp";
import {config} from "@/shared";
import {getPublicAuthConfig} from "@/features/authentication/api/publicConfig";
import {useColorMode} from "@/shared/ui/color-mode";

export async function clientLoader() {
    if (!config.signupEnabled) {
        return redirect("/login");
    }
    try {
        const publicConfig = await getPublicAuthConfig();
        return {oidcEnabled: publicConfig.oidcEnabled, oidcProviderName: publicConfig.oidcProviderName};
    } catch {
        return {oidcEnabled: false, oidcProviderName: null};
    }
}

export async function clientAction({request}: Route.ClientActionArgs) {
    const formData = await request.formData()
    return await signUp(formData);
}

export default function SignUp({loaderData}: Route.ComponentProps) {
    const fetcher = useFetcher();
    const {oidcEnabled, oidcProviderName} = loaderData;
    const {colorMode} = useColorMode();
    const logoSrc = colorMode === "dark"
        ? "/Logo%202-Color%20For%20Dark.svg"
        : "/Logo%202-Color%20For%20Light.svg";

    const handleOidcLogin = () => {
        window.location.href = `${config.authenticationUrl}/login/oidc?returnTo=/oidc-callback`;
    };

    return (
        <Center minH="100%" p={4}>
            <Card.Root w="full" maxW="sm" shadow="lg">
                <Card.Body px={6} pt={8} pb={6}>
                    <Stack align="center" gap={3}>
                        <img src={logoSrc} alt="HomeBranch" style={{height: "100px"}}/>
                        <Text color="fg.muted" fontSize="sm">Create your account</Text>
                    </Stack>
                </Card.Body>
                <Separator/>
                {oidcEnabled && (
                    <Card.Body px={6} py={4}>
                        <Stack gap={4}>
                            <Button
                                variant="outline"
                                width="full"
                                onClick={handleOidcLogin}
                            >
                                Sign up with {oidcProviderName || "OIDC"}
                            </Button>
                            <Box display="flex" alignItems="center" gap={3}>
                                <Separator flex={1}/>
                                <Text fontSize="xs" color="fg.muted" flexShrink={0}>or</Text>
                                <Separator flex={1}/>
                            </Box>
                        </Stack>
                    </Card.Body>
                )}
                <fetcher.Form method="post">
                    <Card.Body px={6} pt={oidcEnabled ? 0 : 4} pb={2}>
                        <Stack gap={4}>
                            <TextField label="Name" name="name" required/>
                            <TextField label="Email" name="email" type="email" required/>
                            <TextField label="Password" name="password" type="password" required/>
                            <TextField label="Confirm Password" name="password_confirmation" type="password" required/>
                        </Stack>
                    </Card.Body>
                    <Card.Footer px={6} pb={6} flexDirection="column" gap={3}>
                        <Button type="submit" width="full" loading={fetcher.state !== "idle"}>
                            Create Account
                        </Button>
                        <Text textAlign="center" fontSize="sm" color="fg.muted">
                            Already have an account?{" "}
                            <Link to="/login" style={{fontWeight: "bold"}}>Sign in</Link>
                        </Text>
                    </Card.Footer>
                </fetcher.Form>
            </Card.Root>
        </Center>
    );
}
