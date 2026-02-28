import {homebranchApi} from "@/shared/api/rtk-query";
import type {AuthorModel} from "@/entities/author";
import type {PaginationResult} from "@/shared/api/api_response";
import {config} from "@/shared";
import type {AuthorSearch} from "@/entities/author/api/types";
import type {BookModel} from "@/entities/book";

export const authorsApi = homebranchApi.injectEndpoints({
    endpoints: (build) => ({
        getAuthors: build.infiniteQuery<PaginationResult<AuthorModel[]>, AuthorSearch, number>({
            infiniteQueryOptions: {
                initialPageParam: 0,
                getNextPageParam: (
                    lastPage,
                    _allPages,
                    lastPageParam,
                ) => {
                    if (!lastPage || typeof lastPage.total !== 'number') {
                        return undefined;
                    }

                    const nextPage = lastPageParam + 1;
                    const remainingPages = Math.ceil(lastPage.total / config.itemsPerPage) - nextPage;

                    if (remainingPages <= 0) {
                        return undefined;
                    }

                    return nextPage;
                }
            },
            query: ({queryArg, pageParam}) =>
                ({url: `/authors?query=${encodeURIComponent(queryArg.query)}${queryArg.userId ? `&userId=${encodeURIComponent(queryArg.userId)}` : ''}&limit=${config.itemsPerPage}&offset=${pageParam * config.itemsPerPage}`}),
            providesTags: (result) =>
                result?.pages.flatMap(page =>
                    [
                        ...page.data.map(({name}: AuthorModel) => ({type: 'Author' as const, id: name})),
                        {type: 'Author', id: 'LIST'},
                        'Author'
                    ]
                ) ?? [{type: 'Author', id: 'LIST'}, 'Author']
        }),
        getAuthor: build.query<AuthorModel, string>({
            query: (name) => ({url: `/authors/${encodeURIComponent(name)}`}),
            providesTags: (_result, _error, name) => [{type: 'Author', id: name}],
        }),
        getBooksByAuthor: build.infiniteQuery<PaginationResult<BookModel[]>, { authorName: string; query: string; userId?: string }, number>({
            infiniteQueryOptions: {
                initialPageParam: 0,
                getNextPageParam: (
                    lastPage,
                    _allPages,
                    lastPageParam,
                ) => {
                    if (!lastPage || typeof lastPage.total !== 'number') {
                        return undefined;
                    }

                    const nextPage = lastPageParam + 1;
                    const remainingPages = Math.ceil(lastPage.total / config.itemsPerPage) - nextPage;

                    if (remainingPages <= 0) {
                        return undefined;
                    }

                    return nextPage;
                }
            },
            query: ({queryArg, pageParam}) =>
                ({url: `/authors/${encodeURIComponent(queryArg.authorName)}/books?query=${encodeURIComponent(queryArg.query)}${queryArg.userId ? `&userId=${encodeURIComponent(queryArg.userId)}` : ''}&limit=${config.itemsPerPage}&offset=${pageParam * config.itemsPerPage}`}),
            providesTags: (result) =>
                result?.pages.flatMap(page =>
                    [
                        ...page.data.map(({id}: BookModel) => ({type: 'Book' as const, id})),
                        {type: 'Book', id: 'LIST'},
                    ]
                ) ?? [{type: 'Book', id: 'LIST'}]
        }),
        updateAuthor:build.mutation<AuthorModel, { name: string; biography: string }>({
            query: ({name, biography}) => ({
                url: `/authors/${encodeURIComponent(name)}`,
                method: 'PATCH',
                body: {biography},
            }),
            invalidatesTags: (_result, _error, {name}) => [{type: 'Author', id: name}],
        }),
        uploadAuthorProfilePicture: build.mutation<AuthorModel, { name: string; file: File }>({
            query: ({name, file}) => {
                const formData = new FormData();
                formData.append('file', file);
                return {
                    url: `/authors/${encodeURIComponent(name)}/profile-picture`,
                    method: 'POST',
                    body: formData,
                };
            },
            invalidatesTags: (_result, _error, {name}) => [{type: 'Author', id: name}],
        }),
    }),
});

export const {
    useGetAuthorsInfiniteQuery,
    useGetAuthorQuery,
    useGetBooksByAuthorInfiniteQuery,
    useUpdateAuthorMutation,
    useUploadAuthorProfilePictureMutation,
} = authorsApi;
