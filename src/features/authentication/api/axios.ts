import axios, {type AxiosError} from "axios";
import {ApiErrorResponse, type ApiErrorResponseDto, config} from "@/shared";
import ToastFactory, {type ToastFactoryParams} from "@/app/utils/toast_handler";

export const authenticationAxiosInstance = axios.create({
    baseURL: config.authenticationUrl,
})

export function axiosErrorHandler(error: AxiosError<ApiErrorResponseDto>) {
    if (error.response) {
        const errorResponseData = new ApiErrorResponse(error.response.data);
        ToastFactory({message: errorResponseData.error.message, type: "error"} as ToastFactoryParams);
    } else {
        ToastFactory({message: "Something went wrong, please try again later", type: "error"} as ToastFactoryParams);
    }
}