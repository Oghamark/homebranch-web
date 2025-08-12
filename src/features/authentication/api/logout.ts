import {authenticationAxiosInstance, axiosErrorHandler} from "@/features/authentication/api/axios";
import {replace} from "react-router";

export async function logout() {
    return await authenticationAxiosInstance.post("/logout").then(response => {
        sessionStorage.removeItem('access_token');
        return replace('/login');
    }).catch(axiosErrorHandler);
}