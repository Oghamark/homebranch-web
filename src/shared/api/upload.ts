import axios from "axios";
import type {FetchBaseQueryError, QueryReturnValue} from "@reduxjs/toolkit/query";

export type UploadProgressCallback = (percentage: number) => void;

export async function uploadWithProgress(
    url: string,
    body: FormData,
    onUploadProgress: UploadProgressCallback,
    signal: AbortSignal,
): Promise<QueryReturnValue<unknown, FetchBaseQueryError, never>> {
    onUploadProgress(0);
    try {
        const response = await axios.post<string>(url, body, {
            withCredentials: true,
            signal,
            responseType: "text",
            transformResponse: [],
            validateStatus: () => true,
            onUploadProgress: ({loaded, total}) => {
                if (total && total > 0) onUploadProgress(Math.min(100, Math.floor(loaded / total * 100)));
            },
        });
        let data: unknown;
        try {
            data = response.data ? JSON.parse(response.data) : null;
        } catch (error) {
            return {error: {
                status: "PARSING_ERROR", originalStatus: response.status, data: response.data,
                error: error instanceof Error ? error.message : String(error),
            }};
        }
        return response.status >= 200 && response.status < 300
            ? {data}
            : {error: {status: response.status, data}};
    } catch (error) {
        return {error: {status: "FETCH_ERROR", error: error instanceof Error ? error.message : String(error)}};
    }
}
