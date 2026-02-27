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
                ({url: `/authors?query=${encodeURIComponent(queryArg.query)}&limit=${config.itemsPerPage}&offset=${pageParam * config.itemsPerPage}`}),
            providesTags: (result) =>
                result?.pages.flatMap(page =>
                    [
                        ...page.data.map(({name}: AuthorModel) => ({type: 'Author' as const, id: name})),
                        {type: 'Author', id: 'LIST'},
                        'Author'
                    ]
                ) ?? [{type: 'Author', id: 'LIST'}, 'Author']
        }),
        getBooksByAuthor: build.infiniteQuery<PaginationResult<BookModel[]>, { authorName: string; query: string }, number>({
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
                ({url: `/authors/${encodeURIComponent(queryArg.authorName)}/books?query=${encodeURIComponent(queryArg.query)}&limit=${config.itemsPerPage}&offset=${pageParam * config.itemsPerPage}`}),
            providesTags: (result) =>
                result?.pages.flatMap(page =>
                    [
                        ...page.data.map(({id}: BookModel) => ({type: 'Book' as const, id})),
                        {type: 'Book', id: 'LIST'},
                    ]
                ) ?? [{type: 'Book', id: 'LIST'}]
        }),
    }),
});

export const {
    useGetAuthorsInfiniteQuery,
    useGetBooksByAuthorInfiniteQuery,
} = authorsApi;
