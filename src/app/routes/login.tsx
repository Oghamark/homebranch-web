import type {Route} from "./+types/login";
import {useEffect, useState} from "react";
import {useSearchParams} from "react-router";
import {login} from "@/features/authentication/api/login";
import {getPublicAuthConfig} from "@/features/authentication/api/publicConfig";
import {AuthLayout} from "@/features/authentication/ui/AuthLayout";
import {AuthForm} from "@/features/authentication/ui/AuthForm";
import ToastFactory from "@/shared/lib/toast/toast";

export async function clientLoader() {
    try {
        const publicConfig = await getPublicAuthConfig();
        return {oidcEnabled: publicConfig.oidcEnabled, oidcProviderName: publicConfig.oidcProviderName};
    } catch {
        return {oidcEnabled: false, oidcProviderName: null};
    }
}

export async function clientAction({request}: Route.ClientActionArgs) {
    return login(await request.formData());
}

export default function Login({loaderData}: Route.ComponentProps) {
    const [searchParams, setSearchParams] = useSearchParams();
    const error = searchParams.get("error");
    const [notice, setNotice] = useState(error);
    useEffect(() => {
        if (error) {
            setNotice(error);
            ToastFactory({message: error, type: "error"});
            setSearchParams(previous => {
                const next = new URLSearchParams(previous);
                next.delete("error");
                return next;
            }, {replace: true});
        }
    }, [error, setSearchParams]);
    return <AuthLayout title="Welcome back" description="Sign in to return to your books and reading spaces.">
        <AuthForm {...loaderData} notice={notice}/>
    </AuthLayout>;
}
