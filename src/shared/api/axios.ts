import axios from "axios";

import {config} from "@/shared";

export const axiosInstance = axios.create({
    baseURL: config.backendUrl,
})

export const authenticationAxiosInstance = axios.create({
    baseURL: config.authenticationUrl,
})