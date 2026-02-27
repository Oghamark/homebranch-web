export type {AuthorModel} from "./model/AuthorModel";

export {AuthorCard, AuthorCardSkeleton} from "./ui/AuthorCard";

export {
    useGetAuthorsInfiniteQuery,
    useGetAuthorQuery,
    useGetBooksByAuthorInfiniteQuery,
    useUpdateAuthorMutation,
    useUploadAuthorProfilePictureMutation,
} from "./api/api";
