import {homebranchApi} from "@/shared/api/rtk-query";
import type {BookModel, CreateBookRequest} from "@/entities/book";
import type {PaginationResult} from "@/shared/api/api_response";

export const booksApi = homebranchApi.injectEndpoints({
    endpoints: (build) => ({
        getBooks: build.query<PaginationResult<BookModel[]>, number>({
            query: (page) => ({url: `/books?limit=${50}&offset=${page * 50}`}),
            providesTags: (result) =>
                result?.data
                    ? [...result.data.map(({id}) => ({type: 'Book' as const, id: id})), {type: 'Book', id: 'LIST'}, 'Book']
                    : [{type: 'Book', id: 'LIST'}, 'Book']
        }),
        getBookById: build.query<BookModel, string>({
            query: (id) => ({url: `/books/${id}`}),
            providesTags: result =>
                result
                    ? [{ type: 'Book' as const, id: result.id}]
                    : []
        }),
        getFavoriteBooks: build.query<PaginationResult<BookModel[]>, number>({
            query: (page: number) => ({url: `/books/favorite?limit=${50}&offset=${page * 50}`}),
            providesTags: (result) =>
                result?.data
                    ? [...result.data.map(({id}) => ({type: 'Book' as const, id: id})), {type: 'Book', id: 'LIST'}, 'Book']
                    : [{type: 'Book', id: 'LIST'}, 'Book']
        }),
        deleteBook: build.mutation<BookModel, string>({
            query: (id: string) => ({url: `/books/${id}`, method: 'DELETE'}),
            invalidatesTags: [{type: 'Book', id: 'LIST'}]
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
    }),
});

const { useGetBooksQuery: useGetBooksQueryBase, useGetFavoriteBooksQuery: useGetFavoriteBooksQueryBase } = booksApi;

export const useGetBooksQuery = (page: number) => {
    return useGetBooksQueryBase(page, {
        selectFromResult: ({data, ...rest}) => ({
            result: data,
            ...rest,
        })
    });
}

export const useGetFavoriteBooksQuery = (page: number) => {
    return useGetFavoriteBooksQueryBase(page, {
        selectFromResult: ({data, ...rest}) => ({
            result: data,
            ...rest,
        })
    });
}

export const {
    useGetBookByIdQuery,
    useGetBooksByIdsQuery,
    useCreateBookMutation,
    useUpdateBookMutation,
    useDeleteBookMutation,
} = booksApi;