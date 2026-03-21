// UI Components
export {BookCard, BookCardSkeleton} from "./ui/BookCard";
export {AddBookButton} from "./ui/AddBookButton";

// Model
export type {BookModel} from "./model/BookModel";
export type {BookDuplicateModel, BookDuplicateWithBooksModel} from "./model/BookDuplicateModel";

// API
export {
    useGetBooksInfiniteQuery,
    useGetFavoriteBooksInfiniteQuery,
    useGetBookByIdQuery,
    useGetBooksByIdsQuery,
    useSearchBooksQuery,
    useCreateBookMutation,
    useUpdateBookMutation,
    useToggleFavoriteMutation,
    useDeleteBookMutation,
    useGenerateBookSummaryMutation,
    useFetchBookMetadataMutation,
    useListDuplicatesQuery,
    useTriggerDuplicateScanMutation,
    useResolveDuplicateMutation,
    parseSearchKeywords,
} from "./api/api";

export type {ResolveDuplicateAction, CreateBookResult} from "./api/api";
export type {CreateBookRequest} from "./api/dtos";