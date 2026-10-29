import type {Route} from "./+types/sign-up";
import {redirect} from "react-router";
import signUp from "@/features/authentication/api/signUp";
import {getPublicAuthConfig} from "@/features/authentication/api/publicConfig";
import {AuthLayout} from "@/features/authentication/ui/AuthLayout";
import {AuthForm} from "@/features/authentication/ui/AuthForm";
import {config} from "@/shared";

export async function clientLoader() {
    if (!config.signupEnabled || config.cloudMode) return redirect("/login");
    try {
        const publicConfig = await getPublicAuthConfig();
        return {oidcEnabled: publicConfig.oidcEnabled, oidcProviderName: publicConfig.oidcProviderName};
    } catch {
        return {oidcEnabled: false, oidcProviderName: null};
    }
}

export async function clientAction({request}: Route.ClientActionArgs) {
    if (!config.signupEnabled || config.cloudMode) return redirect("/login");
    return signUp(await request.formData());
}

export default function SignUp({loaderData}: Route.ComponentProps) {
    return <AuthLayout title="Make room for your next read" description="Create an account.">
        <AuthForm signup {...loaderData}/>
    </AuthLayout>;
}
