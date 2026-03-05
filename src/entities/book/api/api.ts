import {homebranchApi} from "@/shared/api/rtk-query";
import type {BookModel, CreateBookRequest} from "@/entities/book";
import type {PaginationResult} from "@/shared/api/api_response";
import {config} from "@/shared";
import type {QueriedSearch} from "@/entities/book/api/types";
import type {GetBooksByIdsRequest} from "@/entities/book/api/dtos";

/**
 * Parse a search query string for keyword prefixes like `isbn:`, `genre:`, `series:`, `author:`.
 * Returns the extracted keyword params and the remaining plain query text.
 */
export function parseSearchKeywords(raw: string): { query: string; isbn?: string; genre?: string; series?: string; author?: string } {
    let remaining = raw;
    const result: { query: string; isbn?: string; genre?: string; series?: string; author?: string } = {query: ''};
    const keywordRe = /\b(isbn|genre|series|author):("([^"]+)"|(\S+))/gi;
    remaining = remaining.replace(keywordRe, (_match, key: string, _fullVal: string, quoted?: string, unquoted?: string) => {
        const value = (quoted ?? unquoted ?? '').trim();
        const lower = key.toLowerCase() as 'isbn' | 'genre' | 'series' | 'author';
        result[lower] = value;
        return '';
    }).trim();
    result.query = remaining;
    return result;
}

function buildBookSearchUrl(base: string, keywords: ReturnType<typeof parseSearchKeywords>, extra: string = ''): string {
    const params = new URLSearchParams();
    if (keywords.query) params.set('query', keywords.query);
    if (keywords.isbn) params.set('isbn', keywords.isbn);
    if (keywords.genre) params.set('genre', keywords.genre);
    if (keywords.series) params.set('series', keywords.series);
    if (keywords.author) params.set('author', keywords.author);
    const qs = params.toString();
    return `${base}${qs ? '?' + qs : ''}${extra}`;
}

export const booksApi = homebranchApi.injectEndpoints({
    endpoints: (build) => ({
        getBooks: build.infiniteQuery<PaginationResult<BookModel[]>, QueriedSearch, number>({
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
                const keywords = parseSearchKeywords(queryArg.query);
                const params = new URLSearchParams();
                if (keywords.query) params.set('query', keywords.query);
                if (keywords.isbn) params.set('isbn', keywords.isbn);
                if (keywords.genre) params.set('genre', keywords.genre);
                if (keywords.series) params.set('series', keywords.series);
                if (keywords.author) params.set('author', keywords.author);
                if (queryArg.userId) params.set('userId', queryArg.userId);
                params.set('limit', String(config.itemsPerPage));
                params.set('offset', String(pageParam * config.itemsPerPage));
                return {url: `/books?${params.toString()}`};
            },
            providesTags: (result) =>
                result?.pages.flatMap(page =>
                    [
                        ...page.data.map(({id}: BookModel) => ({type: 'Book' as const, id: id})),
                        {type: 'Book', id: 'LIST'},
                        'Book'
                    ]
                ) ?? [{type: 'Book', id: 'LIST'}, 'Book']
        }),
        getBookById:build.query<BookModel, string>({
            query: (id) => ({url: `/books/${id}`}),
            providesTags: result =>
                result
                    ? [{type: 'Book' as const, id: result.id}]
                    : []
        }),
        getFavoriteBooks: build.infiniteQuery<PaginationResult<BookModel[]>, QueriedSearch, number>({
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
                const keywords = parseSearchKeywords(queryArg.query);
                const params = new URLSearchParams();
                if (keywords.query) params.set('query', keywords.query);
                if (keywords.isbn) params.set('isbn', keywords.isbn);
                if (keywords.genre) params.set('genre', keywords.genre);
                if (keywords.series) params.set('series', keywords.series);
                if (keywords.author) params.set('author', keywords.author);
                params.set('limit', String(config.itemsPerPage));
                params.set('offset', String(pageParam * config.itemsPerPage));
                return {url: `/books/favorite?${params.toString()}`};
            },
            providesTags: (result) =>
                result?.pages.flatMap(page =>
                    [
                        ...page.data.map(({id}: BookModel) => ({type: 'Book' as const, id: id})),
                        {type: 'Book', id: 'LIST'},
                        'Book'
                    ]
                ) ?? [{type: 'Book', id: 'LIST'}, 'Book']
        }),
        getBooksByIds: build.query<BookModel[], QueriedSearch<GetBooksByIdsRequest>>({
            async queryFn({query, bookIds}, _queryApi, _extraOptions, fetchWithBQ) {
                const results = await Promise.all(
                    bookIds.map(id => fetchWithBQ({url: `/books/${id}?query=${encodeURIComponent(query)}`}))
                );

                const books = results
                    .filter((r) => r.data)
                    .map((r) => r.data as BookModel);

                const errors = results.filter((r) => r.error).map((r) => r.error);

                // If at least one request succeeded, return the successful books
                if (books.length > 0) {
                    return {data: books};
                }

                // If all requests failed (no books, at least one error), surface an error
                if (errors.length > 0) {
                    return {error: errors[0] as any};
                }

                // Fallback: no data and no error – return an empty array to keep behavior defined
                return {data: []};
            },
            providesTags: (result) =>
                result ? result.map(({id}) => ({type: 'Book' as const, id})) : []
        }),
        searchBooks: build.query<BookModel[], string>({
            query: (query) => {
                const keywords = parseSearchKeywords(query);
                const params = new URLSearchParams();
                if (keywords.query) params.set('query', keywords.query);
                if (keywords.isbn) params.set('isbn', keywords.isbn);
                if (keywords.genre) params.set('genre', keywords.genre);
                if (keywords.series) params.set('series', keywords.series);
                if (keywords.author) params.set('author', keywords.author);
                params.set('limit', '20');
                params.set('offset', '0');
                return {url: `/books?${params.toString()}`};
            },
            transformResponse: (response: PaginationResult<BookModel[]>) => response.data,
            providesTags: (result) =>
                result
                    ? [...result.map(({id}) => ({type: 'Book' as const, id})), {type: 'Book', id: 'LIST'}]
                    : [{type: 'Book', id: 'LIST'}]
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

                const userId = sessionStorage.getItem('user_id');
                const key = `currentlyReading_${userId}`;
                const stored = localStorage.getItem(key);

                if (stored === null) {
                    return;
                }

                try {
                    const currentlyReadingBooks = JSON.parse(stored);
                    currentlyReadingBooks.delete(id);
                    if (Object.keys(currentlyReadingBooks).length === 0) {
                        localStorage.removeItem(key);
                    } else {
                        localStorage.setItem(key, JSON.stringify(currentlyReadingBooks));
                    }
                    return;
                } catch (e) {
                    console.warn(`Encountered error during book deletion cleanup: ${e}`);
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
        generateBookSummary: build.mutation<BookModel, string>({
            query: (id: string) => ({url: `/books/${id}/fetch-summary`, method: 'POST'}),
            invalidatesTags: result => result ? [{type: 'Book' as const, id: result.id}] : []
        }),
        fetchBookMetadata: build.mutation<BookModel, string>({
            query: (id: string) => ({url: `/books/${id}/fetch-metadata`, method: 'POST'}),
            invalidatesTags: result => result ? [{type: 'Book' as const, id: result.id}] : []
        }),
    }),
});

export const {
    useGetBooksInfiniteQuery,
    useGetFavoriteBooksInfiniteQuery,
    useGetBookByIdQuery,
    useGetBooksByIdsQuery,
    useSearchBooksQuery,
    useCreateBookMutation,
    useUpdateBookMutation,
    useDeleteBookMutation,
    useGenerateBookSummaryMutation,
    useFetchBookMetadataMutation,
} = booksApi;