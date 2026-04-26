import type {Route} from "./+types/login";

import TextField from "@/shared/ui/TextField";
import {Box, Button, Card, Center, Separator, Stack, Text} from "@chakra-ui/react";
import {Link, useFetcher, useSearchParams} from "react-router";
import {login} from "@/features/authentication/api/login";
import {config} from "@/shared";
import {getPublicAuthConfig} from "@/features/authentication/api/publicConfig";
import {useEffect} from "react";
import ToastFactory from "@/shared/lib/toast/toast";
import {useColorMode} from "@/shared/ui/color-mode";

export async function clientLoader() {
    try {
        const publicConfig = await getPublicAuthConfig();
        return {oidcEnabled: publicConfig.oidcEnabled, oidcProviderName: publicConfig.oidcProviderName};
    } catch {
        return {oidcEnabled: false, oidcProviderName: null};
    }
}

export async function clientAction({request}: Route.ClientActionArgs) {
    const formData = await request.formData();
    return await login(formData);
}

export default function Login({loaderData}: Route.ComponentProps) {
    const fetcher = useFetcher();
    const {oidcEnabled, oidcProviderName} = loaderData;
    const [searchParams, setSearchParams] = useSearchParams();
    const error = searchParams.get("error");
    const {colorMode} = useColorMode();
    const logoSrc = colorMode === "dark"
        ? "/Logo%202-Color%20For%20Dark.svg"
        : "/Logo%202-Color%20For%20Light.svg";

    useEffect(() => {
        if (error) {
            ToastFactory({message: error, type: "error"});
            setSearchParams({}, {replace: true});
        }
    }, [error, setSearchParams]);

    const handleOidcLogin = () => {
        window.location.href = `${config.authenticationUrl}/login/oidc?returnTo=/oidc-callback`;
    };

    return (
        <Center minH="100%" p={4}>
            <Card.Root w="full" maxW="sm" shadow="lg">
                <Card.Body px={6} pt={8} pb={6}>
                    <Stack align="center" gap={3}>
                        <img src={logoSrc} alt="HomeBranch" style={{height: "100px"}}/>
                        <Text color="fg.muted" fontSize="sm">Your personal library</Text>
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
                                Sign in with {oidcProviderName || "OIDC"}
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
                            <TextField label="Email" name="email" type="email" required/>
                            <TextField label="Password" name="password" type="password" required/>
                        </Stack>
                    </Card.Body>
                    <Card.Footer px={6} pb={6} flexDirection="column" gap={3}>
                        <Button type="submit" width="full" loading={fetcher.state !== "idle"}>
                            Sign In
                        </Button>
                        {config.signupEnabled && (
                            <Text textAlign="center" fontSize="sm" color="fg.muted">
                                Don't have an account?{" "}
                                <Link to="/sign-up" style={{fontWeight: "bold"}}>Sign up</Link>
                            </Text>
                        )}
                    </Card.Footer>
                </fetcher.Form>
            </Card.Root>
        </Center>
    );
}
