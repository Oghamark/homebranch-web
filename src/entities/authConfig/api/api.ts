import {homebranchApi} from "@/shared/api/rtk-query";
import {authAxiosInstance} from "@/shared/api";
import type {FetchBaseQueryError} from "@reduxjs/toolkit/query";
import type {Result} from "@/shared";

export type AuthConfig = {
    signupEnabled: boolean;
};

export const authConfigApi = homebranchApi.injectEndpoints({
    endpoints: (build) => ({
        getAuthConfig: build.query<AuthConfig, void>({
            queryFn: async () => {
                try {
                    const response = await authAxiosInstance.get<Result<AuthConfig>>('/config');
                    if (!response.data.success || !response.data.value) {
                        return {error: {status: 'PARSING_ERROR', data: response.data.message ?? 'Invalid response'} as FetchBaseQueryError};
                    }
                    return {data: response.data.value};
                } catch (error: unknown) {
                    const axiosError = error as {response?: {status: number; data?: {message?: string}}};
                    if (axiosError.response) {
                        return {error: {status: axiosError.response.status, data: axiosError.response.data?.message ?? 'Error'} as FetchBaseQueryError};
                    }
                    return {error: {status: 'FETCH_ERROR', error: 'Network error'} as FetchBaseQueryError};
                }
            },
            providesTags: ['AuthConfig' as never]
        }),
        updateAuthConfig: build.mutation<AuthConfig, Partial<AuthConfig>>({
            queryFn: async (body) => {
                try {
                    const response = await authAxiosInstance.patch<Result<AuthConfig>>('/config', body);
                    if (!response.data.success || !response.data.value) {
                        return {error: {status: 'PARSING_ERROR', data: response.data.message ?? 'Invalid response'} as FetchBaseQueryError};
                    }
                    return {data: response.data.value};
                } catch (error: unknown) {
                    const axiosError = error as {response?: {status: number; data?: {message?: string}}};
                    if (axiosError.response) {
                        return {error: {status: axiosError.response.status, data: axiosError.response.data?.message ?? 'Error'} as FetchBaseQueryError};
                    }
                    return {error: {status: 'FETCH_ERROR', error: 'Network error'} as FetchBaseQueryError};
                }
            },
            invalidatesTags: ['AuthConfig' as never]
        }),
    })
});

export const {useGetAuthConfigQuery, useUpdateAuthConfigMutation} = authConfigApi;
