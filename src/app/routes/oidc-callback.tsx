import type {Route} from "./+types/oidc-callback";

import {Center, Spinner, Stack, Text} from "@chakra-ui/react";
import {redirect} from "react-router";
import {authenticationAxiosInstance} from "@/features/authentication/api/axios";

export async function clientLoader({request}: Route.ClientLoaderArgs) {
    const url = new URL(request.url);
    const error = url.searchParams.get("error");

    if (error) {
        return redirect(`/login?error=${encodeURIComponent(error)}`);
    }

    try {
        const response = await authenticationAxiosInstance.get("/me");
        const user = response.data.value ?? response.data;

        sessionStorage.setItem("user_id", user.id);
        sessionStorage.setItem("user_role", user.role ?? "USER");

        return redirect("/");
    } catch {
        return redirect("/login?error=Authentication%20failed");
    }
}

export default function OidcCallback() {
    return (
        <Center minH="100vh">
            <Stack align="center" gap={4}>
                <Spinner size="xl"/>
                <Text color="fg.muted">Completing sign in...</Text>
            </Stack>
        </Center>
    );
}
