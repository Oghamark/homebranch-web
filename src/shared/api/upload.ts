import axios from "axios";
import type {FetchArgs, FetchBaseQueryError, FetchBaseQueryMeta, QueryReturnValue} from "@reduxjs/toolkit/query";

export type UploadProgressCallback = (percentage: number) => void;
export type UploadRequestArgs = FetchArgs & {onUploadProgress?: UploadProgressCallback; uploadFiles?: File[]};
type UploadSession = {uploadId: string; chunkSize: number};
type UploadResult = QueryReturnValue<unknown, FetchBaseQueryError, FetchBaseQueryMeta>;
type UploadRequest = (args: UploadRequestArgs) => Promise<UploadResult>;

export async function uploadWithProgress(
    url: string,
    body: FormData,
    onUploadProgress: UploadProgressCallback,
    signal: AbortSignal,
    method = "POST",
): Promise<QueryReturnValue<unknown, FetchBaseQueryError, never>> {
    onUploadProgress(0);
    try {
        const response = await axios.request<string>({
            url,
            method,
            data: body,
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

function isUploadSession(value: unknown): value is UploadSession {
    return typeof value === "object" && value !== null &&
        "uploadId" in value && typeof value.uploadId === "string" &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.uploadId) &&
        "chunkSize" in value && typeof value.chunkSize === "number" &&
        Number.isSafeInteger(value.chunkSize) && value.chunkSize > 0 && value.chunkSize <= 32 * 1024 * 1024;
}

export async function uploadFilesInChunks(
    {uploadFiles = [], onUploadProgress, ...finishRequest}: UploadRequestArgs,
    request: UploadRequest,
): Promise<UploadResult> {
    onUploadProgress?.(0);
    const sessionResult = await request({
        url: "/upload-sessions", method: "POST",
        body: {files: uploadFiles.map(file => ({name: file.name, size: file.size}))},
    });
    if (sessionResult.error) return sessionResult;
    if (!isUploadSession(sessionResult.data)) {
        return {error: {status: "CUSTOM_ERROR", error: "The server returned an invalid upload session."}};
    }
    const {uploadId, chunkSize} = sessionResult.data;
    const totalBytes = uploadFiles.reduce((total, file) => total + file.size, 0);
    let completedBytes = 0;
    try {
        for (const [fileIndex, file] of uploadFiles.entries()) {
            for (let offset = 0; offset < file.size; offset += chunkSize) {
                const chunk = file.slice(offset, Math.min(offset + chunkSize, file.size));
                const body = new FormData();
                body.append("chunk", chunk, "chunk");
                const previousBytes = completedBytes;
                let result: UploadResult;
                for (let attempt = 0; ; attempt++) {
                    result = await request({
                        url: `/upload-sessions/${uploadId}/files/${fileIndex}/chunks/${offset / chunkSize}`,
                        method: "PUT", body,
                        onUploadProgress: percentage => onUploadProgress?.(
                            Math.floor((previousBytes + chunk.size * percentage / 100) / totalBytes * 100),
                        ),
                    });
                    const status = result.error?.status === "PARSING_ERROR"
                        ? result.error.originalStatus : result.error?.status;
                    if (!result.error || attempt >= 2 ||
                        !["FETCH_ERROR", 502, 503, 504].includes(status ?? "")) break;
                    await new Promise(resolve => setTimeout(resolve, 250 * 2 ** attempt));
                }
                if (result.error) return result;
                completedBytes += chunk.size;
                onUploadProgress?.(Math.floor(completedBytes / totalBytes * 100));
            }
        }
        onUploadProgress?.(100);
        return await request({...finishRequest, body: {...finishRequest.body, uploadId}});
    } finally {
        const cleanup = await request({url: `/upload-sessions/${uploadId}`, method: "DELETE"});
        if (cleanup.error && cleanup.error.status !== 404) {
            console.warn("Could not clean up the upload session. The server will expire it automatically.", cleanup.error);
        }
    }
}
