import {Stack} from "@chakra-ui/react";
import type {Route} from "./+types/favorites";
import {BookGridSkeletons, CollectionEmpty, LibraryPage} from "@/pages/library";
import {useGetFavoriteBooksInfiniteQuery} from "@/entities/book";
import {CollectionToolbar, useLibraryDisplayMode, useLibrarySearch} from "@/features/library";
import {useMobileNavConfig} from "@/components/navigation/MobileNavContext";
import {ErrorState, PageHeader} from "@/shared/ui/EditorialUI";

export function meta({}: Route.MetaArgs) {
    return [{title: "Homebranch - Favorites"}, {name: "description", content: "Your favorite books"}];
}

export default function Favorites() {
    useMobileNavConfig("Favorites");
    const displayMode = useLibraryDisplayMode();
    const query = useLibrarySearch();
    const {currentData: data, hasNextPage, fetchNextPage, isFetching, isError, refetch, isFetchingNextPage} = useGetFavoriteBooksInfiniteQuery({query});
    const books = data?.pages.flatMap(page => page.data) ?? [];
    const isFetchNextPageError = isError && books.length > 0;
    return <Stack gap={6}>
        <PageHeader title="Favorites" description="A place for the books you want to keep close."/>
        <CollectionToolbar label="Search favorites"/>
        {isError && !isFetchNextPageError && <ErrorState onRetry={refetch}>Your favorites could not be loaded.</ErrorState>}
        {isFetching && !data ? <BookGridSkeletons displayMode={displayMode}/>
            : books.length ? <LibraryPage books={books} fetchMore={fetchNextPage} hasMore={!!hasNextPage}
                totalBooks={data?.pages[0]?.total} displayMode={displayMode} loadingMore={isFetchingNextPage} loadMoreError={isFetchNextPageError}/>
            : !isError && <CollectionEmpty title="No favorites yet" libraryLink>Mark a book as a favorite from its details to find it here.</CollectionEmpty>}
    </Stack>;
}
