import {authenticationAxiosInstance} from "@/features/authentication/api/axios";

export async function refreshAccessToken() {
    return await authenticationAxiosInstance.post('/refresh').catch((error) => {
        console.warn(error)
    });
}