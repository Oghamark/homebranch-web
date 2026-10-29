import {AuthorPage, AuthorPageSkeleton} from "@/pages/author";
import type {Route} from "./+types/author";
import {Stack} from "@chakra-ui/react";
import {useGetAuthorQuery, useGetBooksByAuthorInfiniteQuery} from "@/entities/author";
import {CollectionToolbar, useLibraryDisplayMode, useLibrarySearch, useShowAllUsers} from "@/features/library";
import {useMobileNavConfig} from "@/components/navigation/MobileNavContext";
import {ErrorState} from "@/shared/ui/EditorialUI";
import {CollectionEmpty} from "@/pages/library";

export function meta({params}: Route.MetaArgs) {
    return [{title: `Homebranch - ${params.authorName}`}, {name: "description", content: `Books by ${params.authorName}`}];
}

export default function Author({params}: Route.ComponentProps) {
    const authorName = decodeURIComponent(params.authorName);
    useMobileNavConfig(authorName);
    const query = useLibrarySearch();
    const displayMode = useLibraryDisplayMode();
    const showAllUsers = useShowAllUsers();
    const userId = showAllUsers ? undefined : (sessionStorage.getItem("user_id") ?? undefined);
    const {data: authorData, isLoading: isAuthorLoading, isError: authorError, refetch: retryAuthor} = useGetAuthorQuery(authorName);
    const {currentData: data, hasNextPage, fetchNextPage, isFetching, isError, refetch, isFetchingNextPage} = useGetBooksByAuthorInfiniteQuery({authorName, query, userId});
    const books = data?.pages.flatMap(page => page.data) ?? [];
    const loadMoreError = isError && books.length > 0;

    return <Stack gap={6}>
        <AuthorPage authorName={authorName} biography={authorData?.biography} profilePictureUrl={authorData?.profilePictureUrl}
            isAuthorLoading={isAuthorLoading} books={books} fetchMore={fetchNextPage} hasMore={!!hasNextPage}
            totalBooks={data?.pages[0]?.total} displayMode={displayMode} loadingMore={isFetchingNextPage} loadMoreError={loadMoreError}
            toolbar={<>
                {authorError && <ErrorState onRetry={retryAuthor}>The author biography could not be loaded. You can still browse available books.</ErrorState>}
                <CollectionToolbar label={`Search books by ${authorName}`} scope/>
                {isError && !loadMoreError && <ErrorState onRetry={refetch}>Books by this author could not be loaded.</ErrorState>}
            </>}
            noResultsNode={isFetching && !data ? <AuthorPageSkeleton booksOnly/>
                : !books.length ? isError ? <></> : <CollectionEmpty title={`No books by ${authorName} in this collection`} libraryLink/>
                : undefined}/>
    </Stack>;
}
