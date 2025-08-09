import axios from "axios";

import {config} from "@/shared";

export const axiosInstance = axios.create({
    baseURL: config.backendUrl,
})