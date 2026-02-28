import type {Route} from "./+types/login";

import TextField from "@/components/ui/TextField";
import {Box, Button, Card, Center, Heading, Stack, Text} from "@chakra-ui/react";
import {Link, useFetcher} from "react-router";
import {login} from "@/features/authentication/api/login";
import {LuBookOpen} from "react-icons/lu";
import {config} from "@/shared";

export async function clientAction({request}: Route.ClientActionArgs) {
    const formData = await request.formData();
    return await login(formData);
}

export default function Login() {
    const fetcher = useFetcher();

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
                <fetcher.Form method="post">
                    <Card.Body px={6} pt={6} pb={2}>
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
