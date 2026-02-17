import {homebranchApi} from "@/shared/api/rtk-query";
import type {BookShelfModel, GetBookShelfBooksRequest} from "@/entities/bookShelf";
import type {BookModel} from "@/entities/book";
import type {PaginationResult} from "@/shared/api/api_response";
import {config} from "@/shared";
import type {QueriedSearch} from "@/entities/book/api/types";

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
        getBookShelfById: build.query<BookShelfModel, string>({
            query: (id) => ({url: `/book-shelves/${id}`}),
            providesTags: result =>
                result
                    ? [{type: 'BookShelf' as const, id: result.id}]
                    : []
        }),
        getBookShelfBooks: build.infiniteQuery<PaginationResult<BookModel[]>, QueriedSearch<GetBookShelfBooksRequest>, number>({
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
            query: ({queryArg, pageParam}) => {
                return {url: `/book-shelves/${encodeURIComponent(queryArg.bookShelfId)}/books?query=${queryArg.query}&limit=${config.itemsPerPage}&offset=${pageParam * config.itemsPerPage}`};
            },
            providesTags: (
                _result,
                _error,
                queryArg
            ) => {
                return [{type: 'BookShelf', id: queryArg.bookShelfId}]
            }
        }),
        getBookShelvesByBook: build.query<BookShelfModel[], string>({
            query: (bookId) => ({url: `/book-shelves/by-book/${bookId}`}),
            providesTags: (_result, _error, bookId) => [
                {type: 'BookShelf', id: `book-${bookId}`},
            ],
        }),
        createBookShelf: build.mutation<BookShelfModel, { title: string }>({
            query: (body) => ({url: `/book-shelves`, method: 'POST', body}),
            invalidatesTags: [{type: 'BookShelf', id: 'LIST'}]
        }),
        deleteBookShelf: build.mutation<BookShelfModel, string>({
            query: (id: string) => ({url: `/book-shelves/${id}`, method: 'DELETE'}),
            invalidatesTags: [{type: 'BookShelf', id: 'LIST'}],
        }),
        addBookToBookShelf: build.mutation<BookShelfModel, { shelfId: string; bookId: string }>({
            query: ({shelfId, bookId}) => ({
                url: `/book-shelves/${shelfId}/add-book`,
                method: 'PUT',
                body: {bookId},
            }),
            invalidatesTags: (_result, _error, {shelfId, bookId}) => [
                {type: 'BookShelf', id: shelfId},
                {type: 'BookShelf', id: 'LIST'},
                {type: 'BookShelf', id: `book-${bookId}`},
            ],
        }),
        removeBookFromBookShelf: build.mutation<BookShelfModel, { shelfId: string; bookId: string }>({
            query: ({shelfId, bookId}) => ({
                url: `/book-shelves/${shelfId}/remove-book`,
                method: 'PUT',
                body: {bookId},
            }),
            invalidatesTags: (_result, _error, {shelfId, bookId}) => [
                {type: 'BookShelf', id: shelfId},
                {type: 'BookShelf', id: 'LIST'},
                {type: 'BookShelf', id: `book-${bookId}`},
            ],
        }),
    }),
});

export const {
    useGetBookShelvesQuery,
    useGetBookShelfByIdQuery,
    useGetBookShelfBooksInfiniteQuery,
    useGetBookShelvesByBookQuery,
    useCreateBookShelfMutation,
    useDeleteBookShelfMutation,
    useAddBookToBookShelfMutation,
    useRemoveBookFromBookShelfMutation,
} = bookShelvesApi;
