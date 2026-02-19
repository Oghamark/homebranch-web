import {homebranchApi} from "@/shared/api/rtk-query";
import type {AssignRoleRequest, UserModel} from "@/entities/user";
import type {PaginationResult} from "@/shared/api/api_response";
import {config} from "@/shared";

export const usersApi = homebranchApi.injectEndpoints({
    endpoints: (build => ({
        getUsers: build.infiniteQuery<PaginationResult<UserModel[]>, void, number>({
            infiniteQueryOptions: {
                initialPageParam: 0,
                getNextPageParam: (
                    lastPage,
                    _allPages,
                    lastPageParam,
                    _allPageParams,
                    _queryArg,
                ) => {
                    const nextPage = lastPageParam + 1
                    const remainingPages = Math.ceil(lastPage?.total / config.itemsPerPage) - nextPage

                    if (remainingPages <= 0) {
                        return undefined;
                    }

                    return nextPage;
                }
            },
            query: ({pageParam}) =>
                ({url: `/users?limit=${config.itemsPerPage}&offset=${pageParam * config.itemsPerPage}`}),
            providesTags: (result) =>
                result?.pages.flatMap(page =>
                    [
                        ...page.data.map(({id}: UserModel) => ({type: 'User' as const, id: id})),
                        {type: 'User', id: 'LIST'},
                        'User'
                    ]
                ) ?? [{type: 'User', id: 'LIST'}, 'User']
        }),
        getUserById: build.query<UserModel, string>({
            query: userId => ({url: `/users/${userId}`}),
            providesTags: result => result ? [{type: 'User' as const, id: result.id}] : []
        }),
        restrictUser: build.mutation<UserModel, string>({
            query: userId => ({url: `/users/${userId}/restrict`, method: 'PATCH'}),
            invalidatesTags: [{type: 'User', id: 'LIST'}]
        }),
        unrestrictUser: build.mutation<UserModel, string>({
            query: userId => ({url: `/users/${userId}/unrestrict`, method: 'PATCH'}),
            invalidatesTags: [{type: 'User', id: 'LIST'}]
        }),
        assignRole: build.mutation<UserModel, AssignRoleRequest & { id: string }>({
            query: ({id, ...request}) => ({url: `/users/${id}/role`, method: 'PATCH', body: request}),
            invalidatesTags: [{type: 'User', id: 'LIST'}]
        })
    }))
})

export const {
    useGetUsersInfiniteQuery,
    useGetUserByIdQuery,
    useRestrictUserMutation,
    useUnrestrictUserMutation,
    useAssignRoleMutation,
} = usersApi;
