import type {Route} from "./+types/oidc-callback";

import {redirect} from "react-router";
import {authenticationAxiosInstance} from "@/features/authentication/api/axios";
import {AuthLayout} from "@/features/authentication/ui/AuthLayout";
import {LoadingState} from "@/shared/ui/EditorialUI";

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
    return <AuthLayout title="Returning to your library" description="We're completing sign in with your identity provider.">
        <LoadingState label="Completing sign in..."/>
    </AuthLayout>;
}
