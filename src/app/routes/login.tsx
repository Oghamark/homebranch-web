import type {Route} from "./+types/login";

import TextField from "@/components/ui/TextField";
import {Box, Button, Card, Center, Heading, Separator, Stack, Text} from "@chakra-ui/react";
import {Link, useFetcher, useSearchParams} from "react-router";
import {login} from "@/features/authentication/api/login";
import {LuBookOpen} from "react-icons/lu";
import {config} from "@/shared";
import {getPublicAuthConfig} from "@/features/authentication/api/publicConfig";
import {useEffect} from "react";
import ToastFactory from "@/app/utils/toast_handler";

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
        <Center minH="100%" bg="bg.subtle" p={4}>
            <Card.Root w="full" maxW="sm" shadow="lg" overflow="hidden">
                <Box colorPalette="teal" bg="colorPalette.600" py={8}>
                    <Stack align="center" gap={2}>
                        <LuBookOpen size={48} color="white"/>
                        <Heading color="white" size="xl">HomeBranch</Heading>
                        <Text color="white" opacity={0.8} fontSize="sm">Your personal library</Text>
                    </Stack>
                </Box>
                {oidcEnabled && (
                    <Card.Body px={6} pt={6} pb={0}>
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
                    <Card.Body px={6} pt={oidcEnabled ? 2 : 6} pb={2}>
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
