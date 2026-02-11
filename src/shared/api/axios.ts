import axios from "axios";

import {config} from "@/shared";
import {refreshAccessToken} from "@/features/authentication/api/refreshAccessToken";

let _navigate: ((path: string) => void) | null = null;

export const setNavigateCallback = (navigate: ((path: string) => void) | null) => {
    _navigate = navigate;
}

export const axiosInstance = axios.create({
    baseURL: config.apiUrl,
    headers: {'Content-Type': 'application/json'},
    withCredentials: true,
})

axiosInstance.interceptors.response.use(
    response => response,
    async (error) => {
        const prevRequest = error?.config;
        if (error.response.status === 401) {
            if (prevRequest.sent) {
                _navigate ? _navigate("/login") : window.location.href = "/login";
            } else {
                prevRequest.sent = true;
                await refreshAccessToken();
                return axiosInstance(prevRequest);
            }
            error.handledByInterceptor = true;
        }
        return Promise.reject(error);
    }
);