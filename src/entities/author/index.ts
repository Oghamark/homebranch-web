export type {AuthorModel} from "./model/AuthorModel";

export {AuthorCard, AuthorCardSkeleton} from "./ui/AuthorCard";

export {
    useGetAuthorsInfiniteQuery,
    useGetBooksByAuthorInfiniteQuery,
} from "./api/api";
