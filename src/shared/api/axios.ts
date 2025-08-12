import axios from "axios";

import {config} from "@/shared";
import {refreshAccessToken} from "@/features/authentication/api/refreshAccessToken";

let _navigate: ((path: string) => void) | null = null;

export const setNavigateCallback = (navigate: ((path: string) => void) | null) => {
    _navigate = navigate;
}

export const axiosInstance = axios.create({
    baseURL: config.backendUrl,
    headers: { 'Content-Type': 'application/json' },
    withCredentials: true,
})

axiosInstance.interceptors.response.use(
    response => {
        console.log(response);
        return response
    },
    async (error) => {
        console.log("Axios interceptor called")
        const prevRequest = error?.config;
        if (error.response.status === 401) {
            console.log("401 response");
            if (prevRequest.sent) {
                console.log("Redirecting to login");
                _navigate ? _navigate("/login") : window.location.href = "/login";
            } else {
                console.log("Refreshing access token");
                prevRequest.sent = true;
                await refreshAccessToken();
                return axiosInstance(prevRequest);
            }
            error.handledByInterceptor = true;
        }
        return Promise.reject(error);
    }
);
