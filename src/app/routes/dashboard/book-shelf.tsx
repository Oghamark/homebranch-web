import {Stack, Text} from "@chakra-ui/react";
import {useParams} from "react-router";
import {BookShelfOptionsMenu, ManageBookShelfBooksButton, useGetBookShelfBooksInfiniteQuery, useGetBookShelfByIdQuery} from "@/entities/bookShelf";
import {BookGridSkeletons, CollectionEmpty, LibraryPage} from "@/pages/library";
import type {Route} from "./+types/book-shelf";
import {CollectionToolbar, useLibraryDisplayMode, useLibrarySearch} from "@/features/library";
import {useMobileNavConfig} from "@/components/navigation/MobileNavContext";
import {ErrorState, LoadingState, PageHeader} from "@/shared/ui/EditorialUI";

export function meta({}: Route.MetaArgs) {
    return [{title: "Homebranch - Bookshelf"}, {name: "description", content: "View books on a shelf"}];
}

export default function BookShelf() {
    const {bookShelfId} = useParams();
    if (!bookShelfId) return null;
    return <BookShelfContent key={bookShelfId} bookShelfId={bookShelfId}/>;
}

function BookShelfContent({bookShelfId}: {bookShelfId: string}) {
    const displayMode = useLibraryDisplayMode();
    const query = useLibrarySearch();
    const {currentData: data, isFetching, isError, refetch, hasNextPage, fetchNextPage, isFetchingNextPage} = useGetBookShelfBooksInfiniteQuery({bookShelfId, query});
    const {data: shelf, isLoading: loadingShelf, isError: shelfError, refetch: retryShelf} = useGetBookShelfByIdQuery(bookShelfId);
    useMobileNavConfig(shelf?.title ?? "Bookshelf");
    const books = data?.pages.flatMap(page => page.data) ?? [];
    const isFetchNextPageError = isError && books.length > 0;

    if (loadingShelf) return <LoadingState label="Loading bookshelf..."/>;
    if (shelfError || !shelf) return <ErrorState onRetry={retryShelf}>This shelf could not be loaded. It may have been removed or may be unavailable.</ErrorState>;
    return <Stack gap={6}>
        <PageHeader title={shelf.title} description="A collection arranged by you." actions={<>
            <ManageBookShelfBooksButton bookShelf={shelf}/>
            <BookShelfOptionsMenu bookShelfId={shelf.id} bookShelfTitle={shelf.title}/>
        </>}/>
        <Text color="fg.muted" fontSize="sm">Use Add books to manage membership. Removing a book from this shelf keeps it in your library.</Text>
        <CollectionToolbar label="Search this shelf"/>
        {isError && !isFetchNextPageError && <ErrorState onRetry={refetch}>The books on this shelf could not be loaded.</ErrorState>}
        {isFetching && !data ? <BookGridSkeletons displayMode={displayMode}/>
            : books.length ? <LibraryPage books={books} fetchMore={fetchNextPage} hasMore={!!hasNextPage}
                totalBooks={data?.pages[0]?.total} displayMode={displayMode} loadingMore={isFetchingNextPage} loadMoreError={isFetchNextPageError}/>
            : !isError && <CollectionEmpty title="This shelf is ready for books">Use Add books above to choose books from your library.</CollectionEmpty>}
    </Stack>;
}
