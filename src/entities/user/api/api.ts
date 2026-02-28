import {homebranchApi} from "@/shared/api/rtk-query";
import type {CreateUserRequest, UpdateUserRoleRequest, UserModel} from "@/entities/user";
import {authAxiosInstance} from "@/shared/api";
import type {FetchBaseQueryError} from "@reduxjs/toolkit/query";
import type {Result} from "@/shared";

export const usersApi = homebranchApi.injectEndpoints({
    endpoints: (build => ({
        getUsers: build.query<UserModel[], void>({
            queryFn: async () => {
                try {
                    const response = await authAxiosInstance.get<Result<UserModel[]>>('/users');
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
            providesTags: (result) =>
                result
                    ? [...result.map(({id}) => ({type: 'User' as const, id})), {type: 'User', id: 'LIST'}]
                    : [{type: 'User', id: 'LIST'}]
        }),
        getUserById: build.query<UserModel, string>({
            queryFn: async (userId) => {
                try {
                    const response = await authAxiosInstance.get<Result<UserModel>>(`/users/${userId}`);
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
            providesTags: result => result ? [{type: 'User' as const, id: result.id}] : []
        }),
        updateUserRole: build.mutation<UserModel, { id: string } & UpdateUserRoleRequest>({
            queryFn: async ({id, role}) => {
                try {
                    const response = await authAxiosInstance.patch<Result<UserModel>>(`/users/${id}/role`, {role});
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
            invalidatesTags: [{type: 'User', id: 'LIST'}]
        }),
        createUser: build.mutation<UserModel, CreateUserRequest>({
            queryFn: async (request) => {
                try {
                    const response = await authAxiosInstance.post<Result<UserModel>>('/users', request);
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
            invalidatesTags: [{type: 'User', id: 'LIST'}]
        }),
        deleteUser: build.mutation<void, string>({
            queryFn: async (email) => {
                try {
                    await authAxiosInstance.delete('/users', {data: {email}});
                    return {data: undefined};
                } catch (error: unknown) {
                    const axiosError = error as {response?: {status: number; data?: {message?: string}}};
                    if (axiosError.response) {
                        return {error: {status: axiosError.response.status, data: axiosError.response.data?.message ?? 'Error'} as FetchBaseQueryError};
                    }
                    return {error: {status: 'FETCH_ERROR', error: 'Network error'} as FetchBaseQueryError};
                }
            },
            invalidatesTags: [{type: 'User', id: 'LIST'}]
        }),
    }))
})

export const {
    useGetUsersQuery,
    useGetUserByIdQuery,
    useUpdateUserRoleMutation,
    useCreateUserMutation,
    useDeleteUserMutation,
} = usersApi;
