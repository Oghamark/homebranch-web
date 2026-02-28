import {
    type BaseQueryFn,
    createApi,
    type FetchArgs,
    type FetchBaseQueryError,
    type FetchBaseQueryMeta,
    type QueryReturnValue
} from "@reduxjs/toolkit/query/react";
import {fetchBaseQuery} from "@reduxjs/toolkit/query";
import {config, type Result} from "@/shared";
import ToastFactory from "@/app/utils/toast_handler";
import {Mutex} from "async-mutex";

// Create a mutex to prevent multiple refresh attempts
const refreshTokenMutex = new Mutex();

const baseQueryWithResultUnwrap: BaseQueryFn<
    string | FetchArgs,
    unknown,
    FetchBaseQueryError
> = async (args, api, extraOptions): Promise<QueryReturnValue<unknown, FetchBaseQueryError, FetchBaseQueryMeta>> => {
    // wait until the mutex is available without locking it
    await refreshTokenMutex.waitForUnlock();
    let result = await fetchBaseQuery({
        baseUrl: config.apiUrl,
        credentials: 'include',
    })(args, api, extraOptions);

    if (result.error && result.error.status === 401) {
        if (!refreshTokenMutex.isLocked()) {
            const release = await refreshTokenMutex.acquire();
            try {
                // refresh the token
                const refreshResult = await fetchBaseQuery({
                    baseUrl: config.authenticationUrl,
                    credentials: 'include',
                    method: 'POST',
                })({url: '/refresh'}, api, extraOptions);

                if (refreshResult.data) {
                    result = await fetchBaseQuery({
                        baseUrl: config.apiUrl,
                        credentials: 'include',
                    })(args, api, extraOptions);
                } else {
                    // Refresh failed, log out
                    window.location.href = '/login';
                }
            } finally {
                release();
            }
        } else {
            // Wait for the mutex to be released by the other request
            await refreshTokenMutex.waitForUnlock();
            // Retry the original query (token should be refreshed now)
            result = await fetchBaseQuery({
                baseUrl: config.apiUrl,
                credentials: 'include',
            })(args, api, extraOptions);
        }
    }

    if (result.data) {
        const response = result.data as Result<unknown>;

        if (response.success) {
            // Success - unwrap the value
            return {
                ...result,
                data: response.value
            } as QueryReturnValue<unknown, FetchBaseQueryError, FetchBaseQueryMeta>;
        } else {
            // Backend returned success: false - treat as error
            return {
                error: {
                    status: response.error,
                    data: response.message
                } as FetchBaseQueryError,
            };
        }
    }

    // Network error or other issue
    return result;
}

export const homebranchApi = createApi({
    baseQuery: baseQueryWithResultUnwrap,
    tagTypes: ['Book', 'BookShelf', 'User', 'Author'],
    endpoints: () => ({})
})

export const authenticationApi = createApi({
    reducerPath: 'authentication',
    baseQuery: fetchBaseQuery({baseUrl: config.authenticationUrl}),
    endpoints: () => ({})
})

/**
 * Type predicate to narrow an unknown error to `FetchBaseQueryError`
 */
export function isFetchBaseQueryError(
    error: unknown,
): error is FetchBaseQueryError {
    return typeof error === 'object' && error != null && 'status' in error
}

/**
 * Type predicate to narrow an unknown error to an object with a string 'message' property
 */
export function isErrorWithMessage(
    error: unknown,
): error is { message: string } {
    return (
        typeof error === 'object' &&
        error != null &&
        'message' in error &&
        typeof (error as any).message === 'string'
    )
}

export function handleRtkError(error: unknown) {
    if (isFetchBaseQueryError(error)) {
        ToastFactory({message: JSON.stringify(error.data), type: "error"});
    } else if (isErrorWithMessage(error)) {
        ToastFactory({message: error.message, type: "error"});
    } else {
        ToastFactory({message: "Something went wrong", type: "error"});
    }
}