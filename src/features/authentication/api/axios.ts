import axios from "axios";
import {ApiErrorResponse, config} from "@/shared";
import ToastFactory from "@/shared/lib/toast/toast";

export const authenticationAxiosInstance = axios.create({
    baseURL: config.authenticationUrl,
    withCredentials: true,
})

export function axiosErrorHandler(error: any) {
    if (!error.handledByInterceptor) {
        if (error.response) {
            const errorResponseData = new ApiErrorResponse(error.response.data);
            errorResponseData.message.forEach(message => {
                ToastFactory({message: message, type: "error"});
            })
        } else {
            ToastFactory({message: "Something went wrong, please try again later", type: "error"});
        }
    }
    return null;
}
