import {BookGridSkeletons, CollectionEmpty, LibraryPage} from "@/pages/library";
import type {Route} from "./+types/library";
import {Stack} from "@chakra-ui/react";
import {AddBookButton, useGetBooksInfiniteQuery} from "@/entities/book";
import {CollectionToolbar, useLibraryDisplayMode, useLibrarySearch, useShowAllUsers} from "@/features/library";
import {useMobileNavConfig} from "@/components/navigation/MobileNavContext";
import {ErrorState, PageHeader} from "@/shared/ui/EditorialUI";

export function meta({}: Route.MetaArgs) {
    return [{title: "Homebranch - Library"}, {name: "description", content: "Browse and search your books"}];
}

export default function Library() {
    useMobileNavConfig("Library");
    const query = useLibrarySearch();
    const showAllUsers = useShowAllUsers();
    const displayMode = useLibraryDisplayMode();
    const userId = showAllUsers ? undefined : (sessionStorage.getItem("user_id") ?? undefined);
    const {currentData: data, hasNextPage, fetchNextPage, isFetching, isError, refetch, isFetchingNextPage} = useGetBooksInfiniteQuery({query, userId});
    const books = data?.pages.flatMap(page => page.data) ?? [];
    const isFetchNextPageError = isError && books.length > 0;

    return <Stack gap={6}>
        <PageHeader title="Library" description="Find your next read or return to an old favorite."
            actions={<AddBookButton variant="solid" colorPalette="orange" width="auto" size="md"/>}/>
        <CollectionToolbar label="Search library" scope/>
        {isError && !isFetchNextPageError && <ErrorState onRetry={refetch}>Your library could not be loaded. Your books have not been changed.</ErrorState>}
        {isFetching && !data ? <BookGridSkeletons displayMode={displayMode}/>
            : books.length ? <LibraryPage books={books} fetchMore={fetchNextPage} hasMore={!!hasNextPage}
                totalBooks={data?.pages[0]?.total} displayMode={displayMode} loadingMore={isFetchingNextPage} loadMoreError={isFetchNextPageError}/>
            : !isError && <CollectionEmpty title={showAllUsers ? "No books have been added yet" : "Your library is ready for its first book"}>
                Use Add books above to upload your books.
            </CollectionEmpty>}
    </Stack>;
}
