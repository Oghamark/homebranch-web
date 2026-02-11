import {homebranchApi} from "@/shared/api/rtk-query";
import type {BookShelfModel} from "@/entities/bookShelf";
import type {BookModel} from "@/entities/book";
import type {PaginationResult} from "@/shared/api/api_response";
import {config} from "@/shared";

export const bookShelvesApi = homebranchApi.injectEndpoints({
    endpoints: (build) => ({
        getBookShelves: build.query<BookShelfModel[], void>({
            query: () => ({url: `/book-shelves`}),
            transformResponse: (response: PaginationResult<BookShelfModel[]>) => response.data,
            providesTags: (result) =>
                result
                    ? [...result.map(({id}) => ({type: 'BookShelf' as const, id})), {type: 'BookShelf', id: 'LIST'}]
                    : [{type: 'BookShelf', id: 'LIST'}]
        }),
        getBookShelfBooks: build.infiniteQuery<PaginationResult<BookModel[]>, string, number>({
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
            query: ({queryArg: bookShelfId, pageParam}) => {
                return {url: `/book-shelves/${bookShelfId}/books?limit=${config.itemsPerPage}&offset=${pageParam * config.itemsPerPage}`};
            },
            providesTags: (
                _result,
                _error,
                bookShelfId
            ) => {
                return [{type: 'BookShelf', id: bookShelfId}]
            }
        }),
        createBookShelf: build.mutation<BookShelfModel, { title: string }>({
            query: (body) => ({url: `/book-shelves`, method: 'POST', body}),
            invalidatesTags: [{type: 'BookShelf', id: 'LIST'}]
        }),
        deleteBookShelf: build.mutation<BookShelfModel, string>({
            query: (id: string) => ({url: `/book-shelves/${id}`, method: 'DELETE'}),
            invalidatesTags: [{type: 'BookShelf', id: 'LIST'}],
        })
    }),
});

export const {
    useGetBookShelvesQuery,
    useGetBookShelfBooksInfiniteQuery,
    useCreateBookShelfMutation,
    useDeleteBookShelfMutation,
} = bookShelvesApi;
