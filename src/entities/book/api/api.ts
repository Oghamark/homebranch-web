import {homebranchApi} from "@/shared/api/rtk-query";
import type {BookModel, CreateBookRequest} from "@/entities/book";
import type {PaginationResult} from "@/shared/api/api_response";
import {config} from "@/shared";

export const booksApi = homebranchApi.injectEndpoints({
    endpoints: (build) => ({
        getBooks: build.infiniteQuery<PaginationResult<BookModel[]>, void, number>({
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

                    if(remainingPages <= 0) {
                        return undefined;
                    }

                    return nextPage;
                }
            },
            query: ({pageParam}) =>
                ({url: `/books?limit=${config.itemsPerPage}&offset=${pageParam * config.itemsPerPage}`}),
            providesTags: (result) =>
                result?.pages.flatMap(page =>
                    [
                        ...page.data.map(({id}: BookModel) => ({type: 'Book' as const, id: id})),
                        {type: 'Book', id: 'LIST'},
                        'Book'
                    ]
                ) ?? [{type: 'Book', id: 'LIST'}, 'Book']
        }),
        getBookById: build.query<BookModel, string>({
            query: (id) => ({url: `/books/${id}`}),
            providesTags: result =>
                result
                    ? [{ type: 'Book' as const, id: result.id}]
                    : []
        }),
        getFavoriteBooks: build.infiniteQuery<PaginationResult<BookModel[]>, void, number>({
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

                    if(remainingPages <= 0) {
                        return undefined;
                    }

                    return nextPage;
                }
            },
            query: ({pageParam}) =>
                ({url: `/books/favorite?limit=${config.itemsPerPage}&offset=${pageParam * config.itemsPerPage}`}),
            providesTags: (result) =>
                result?.pages.flatMap(page =>
                    [
                        ...page.data.map(({id}: BookModel) => ({type: 'Book' as const, id: id})),
                        {type: 'Book', id: 'LIST'},
                        'Book'
                    ]
                ) ?? [{type: 'Book', id: 'LIST'}, 'Book']
        }),
        getBooksByIds: build.query<BookModel[], string[]>({
            async queryFn(ids, _queryApi, _extraOptions, fetchWithBQ) {
                const results = await Promise.all(
                    ids.map(id => fetchWithBQ({url: `/books/${id}`}))
                );
                const books = results
                    .filter(r => r.data)
                    .map(r => r.data as BookModel);
                return {data: books};
            },
            providesTags: (result) =>
                result ? result.map(({id}) => ({type: 'Book' as const, id})) : []
        }),
        deleteBook: build.mutation<BookModel, string>({
            query: (id: string) => ({url: `/books/${id}`, method: 'DELETE'}),
            invalidatesTags: [{type: 'Book', id: 'LIST'}],
            async onQueryStarted(id, {queryFulfilled}) {
                try {
                    await queryFulfilled;
                } catch {
                    // If the delete fails, do not modify localStorage.
                    return;
                }

                if (typeof localStorage === 'undefined') {
                    return;
                }

                const key = 'currentlyReading';
                const stored = localStorage.getItem(key);

                if (stored === null) {
                    return;
                }

                try {
                    const parsed = JSON.parse(stored);
                    if (Array.isArray(parsed)) {
                        const updated = parsed.filter((storedId) => storedId !== id);
                        if (updated.length === 0) {
                            localStorage.removeItem(key);
                        } else {
                            localStorage.setItem(key, JSON.stringify(updated));
                        }
                        return;
                    }
                } catch {
                    // Not JSON or not an array; fall through to string comparison.
                }

                if (stored === id) {
                    localStorage.removeItem(key);
                }
            }
        }),
        createBook: build.mutation<BookModel, CreateBookRequest>({
            query: (book: CreateBookRequest) => {
                const formData = new FormData();
                Object.entries(book).forEach(([key, value]) => {
                    switch (typeof value) {
                        case "boolean":
                            formData.append(key, value ? "true" : "false");
                            break;
                        case "undefined":
                            break;
                        default:
                            formData.append(key, value);
                            break;
                    }
                })
                return ({url: `/books`, method: 'POST', body: formData})
            },
            invalidatesTags: [{type: 'Book', id: 'LIST'}]
        }),
        updateBook: build.mutation<BookModel, BookModel>({
            query: (book: BookModel) => ({url: `/books/${book.id}`, method: 'PUT', body: book}),
            invalidatesTags: result => result ? [{type: 'Book' as const, id: result.id}] : []
        }),
    }),
});

export const {
    useGetBooksInfiniteQuery,
    useGetFavoriteBooksInfiniteQuery,
    useGetBookByIdQuery,
    useGetBooksByIdsQuery,
    useCreateBookMutation,
    useUpdateBookMutation,
    useDeleteBookMutation,
} = booksApi;