import {homebranchApi} from "@/shared/api/rtk-query";
import type {CreateUserRequest, UpdateUserRoleRequest, UserModel, UserSearchResult} from "@/entities/user";
import {authAxiosInstance} from "@/shared/api";
import type {FetchBaseQueryError} from "@reduxjs/toolkit/query";
import type {Result} from "@/shared";

export interface UserDisplayName { id: string; name: string; }

export const usersApi = homebranchApi.injectEndpoints({
    endpoints: (build => ({
        getDisplayNames: build.query<UserDisplayName[], string[]>({
            serializeQueryArgs: ({endpointName, queryArgs}) =>
                `${endpointName}:${JSON.stringify([...new Set(queryArgs.map(id => id.toLowerCase()))].sort())}`,
            queryFn: async (userIds) => {
                const ids = [...new Set(userIds.map(id => id.toLowerCase()))].sort();
                const names: UserDisplayName[] = [];
                try {
                    for (let offset = 0; offset < ids.length; offset += 50) {
                        const response = await authAxiosInstance.post<Result<UserDisplayName[]>>('/users/display-names', {
                            userIds: ids.slice(offset, offset + 50)
                        });
                        if (!response.data.success || !Array.isArray(response.data.value)) {
                            return {error: {status: 'PARSING_ERROR', data: response.data.message ?? 'Invalid response'} as FetchBaseQueryError};
                        }
                        names.push(...response.data.value);
                    }
                    return {data: names};
                } catch (error: unknown) {
                    const axiosError = error as {response?: {status: number; data?: {message?: string}}};
                    if (axiosError.response) {
                        return {error: {status: axiosError.response.status, data: axiosError.response.data?.message ?? 'Error'} as FetchBaseQueryError};
                    }
                    return {error: {status: 'FETCH_ERROR', error: 'Network error'} as FetchBaseQueryError};
                }
            },
            providesTags: (_result, _error, ids) => [
                {type: 'User', id: 'LIST'},
                ...ids.map(id => ({type: 'User' as const, id: id.toLowerCase()}))
            ]
        }),
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
        searchUsers: build.query<UserSearchResult[], string>({
            queryFn: async (query) => {
                const trimmedQuery = query.trim();
                if (trimmedQuery.length < 2) return {data: []};
                try {
                    const response = await authAxiosInstance.get<Result<UserSearchResult[]>>('/users/search', {
                        params: {query: trimmedQuery}
                    });
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
            }
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
    useGetDisplayNamesQuery,
    useGetUsersQuery,
    useSearchUsersQuery,
    useGetUserByIdQuery,
    useUpdateUserRoleMutation,
    useCreateUserMutation,
    useDeleteUserMutation,
} = usersApi;
