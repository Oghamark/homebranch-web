import {authenticationAxiosInstance} from "@/features/authentication/api/axios";

export interface PublicAuthConfig {
    signupEnabled: boolean;
    oidcEnabled: boolean;
    oidcProviderName: string | null;
}

export async function getPublicAuthConfig(): Promise<PublicAuthConfig> {
    const response = await authenticationAxiosInstance.get("/config/public");
    return response.data.value;
}
