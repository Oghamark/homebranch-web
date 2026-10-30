import {BookCard, BookCardSkeleton, useGetBooksByIdsQuery, useGetBooksInfiniteQuery, useGetFavoriteBooksInfiniteQuery, useSearchBooksQuery, type BookModel} from "@/entities/book";
import {AddBookButton} from "@/entities/book/ui/AddBookButton";
import {useMobileNavConfig} from "@/components/navigation/MobileNavContext";
import {useStorageLocations} from "@/features/reader";
import {Button, Grid, Stack} from "@chakra-ui/react";
import {useMemo} from "react";
import {Link} from "react-router";
import {EmptyState, ErrorState, LoadingState, PageHeader, PageSection} from "@/shared/ui/EditorialUI";
import type {Route} from "./+types/dashboard";

export function meta({}: Route.MetaArgs) {
    return [{title: "Homebranch - Dashboard"}, {name: "description", content: "Your reading dashboard"}];
}

const gridColumns = {base: "repeat(2, minmax(0, 1fr))", sm: "repeat(3, minmax(0, 1fr))", lg: "repeat(6, minmax(0, 1fr))"};

function BookGrid({books}: {books: BookModel[]}) {
    return <Grid gridTemplateColumns={gridColumns} gap={{base: 4, md: 6}} minW={0}>
        {books.map(book => <BookCard key={book.id} book={book}/>)}
    </Grid>;
}

function BookSkeletonGrid() {
    return <Grid gridTemplateColumns={gridColumns} gap={{base: 4, md: 6}} minW={0} role="status" aria-label="Loading books">
        {Array.from({length: 6}, (_, index) => <BookCardSkeleton key={index}/>)}
    </Grid>;
}

export default function Dashboard() {
    useMobileNavConfig("Dashboard");

    const userId = sessionStorage.getItem("user_id") ?? undefined;
    const recentQuery = useGetBooksInfiniteQuery({query: "", userId});
    const recentBooks = recentQuery.currentData?.pages[0]?.data.slice(0, 6) ?? [];
    const favoritesQuery = useGetFavoriteBooksInfiniteQuery({query: ""});
    const favoriteBooks = favoritesQuery.currentData?.pages[0]?.data ?? [];
    const localBookIds = useMemo(() => {
        try {
            return Object.keys(JSON.parse(localStorage.getItem(`currentlyReading_${userId}`) ?? "{}") ?? {});
        } catch {
            return [];
        }
    }, [userId]);
    const {allBookIds, isLoading: isReadingDiscoveryLoading, discoveryError, retry} = useStorageLocations(localBookIds);
    const readingQuery = useGetBooksByIdsQuery({bookIds: allBookIds, query: ""}, {skip: allBookIds.length === 0});
    const readingBooks = readingQuery.currentData ?? [];
    const recommendationGenre = useMemo(() => {
        const genres = [...favoriteBooks, ...readingBooks].flatMap(book => book.genres ?? []);
        return genres[0];
    }, [favoriteBooks, readingBooks]);
    const recommendationsQuery = useSearchBooksQuery(
        recommendationGenre ? {query: `genre:${recommendationGenre}`, userId} : {query: "", userId},
        {skip: !recommendationGenre},
    );
    const recommendationLoading = (favoritesQuery.isFetching && !favoritesQuery.currentData) ||
        (!recommendationGenre && (isReadingDiscoveryLoading || readingQuery.isFetching));
    const excludedIds = new Set([...favoriteBooks, ...readingBooks, ...recentBooks].map(book => book.id));
    const recommendedBooks = (recommendationsQuery.currentData ?? [])
        .filter(book => !excludedIds.has(book.id))
        .slice(0, 6);

    return <Stack gap={{base: 8, md: 10}} minW={0}>
        <PageHeader title="Your reading dashboard" description="Pick up where you left off, discover new additions, and find your next read."
            actions={<AddBookButton variant="solid" colorPalette="orange" width="auto" size="md"/>}/>

        <PageSection title="Continue reading" description="Your books in progress."
            actions={<Button asChild variant="outline" minH="44px"><Link to="/currently-reading">See all</Link></Button>}>
            {isReadingDiscoveryLoading ? <LoadingState label="Checking saved reading progress..."/> :
                discoveryError ? <ErrorState onRetry={retry}>Some saved reading progress could not be checked.</ErrorState> :
                    readingQuery.isError ? <ErrorState onRetry={readingQuery.refetch}>Your in-progress books could not be loaded.</ErrorState> :
                        readingQuery.isFetching && !readingQuery.currentData ? <BookSkeletonGrid/> :
                            readingBooks.length ? <BookGrid books={readingBooks.slice(0, 6)}/> :
                                <EmptyState title="Ready for your next chapter?">
                                    Books you open will appear here so you can easily continue reading.
                                </EmptyState>}
        </PageSection>

        <PageSection title="Recently added" description="The latest books in your library."
            actions={<Button asChild variant="outline" minH="44px"><Link to="/library">Browse library</Link></Button>}>
            {recentQuery.isError ? <ErrorState onRetry={recentQuery.refetch}>Recently added books could not be loaded.</ErrorState> :
                recentQuery.isFetching && !recentQuery.currentData ? <BookSkeletonGrid/> :
                    recentBooks.length ? <BookGrid books={recentBooks}/> :
                        <EmptyState title="Your library is ready for its first book">Add books to see them here.</EmptyState>}
        </PageSection>

        <PageSection title="Recommended for you" description={recommendationGenre
            ? `More books in ${recommendationGenre}.`
            : "Books picked to match what you enjoy."}>
            {recommendationLoading ? <LoadingState label="Finding recommendations..."/> :
                !recommendationGenre && favoritesQuery.isError ? <ErrorState onRetry={favoritesQuery.refetch}>Your reading interests could not be loaded.</ErrorState> :
                    recommendationsQuery.isError ? <ErrorState onRetry={recommendationsQuery.refetch}>Recommendations could not be loaded.</ErrorState> :
                recommendationsQuery.isFetching && !recommendationsQuery.currentData ? <BookSkeletonGrid/> :
                    recommendedBooks.length ? <BookGrid books={recommendedBooks}/> :
                        <EmptyState title="Build your recommendations">
                            Favorite a book or start reading to get recommendations based on your interests.
                        </EmptyState>}
        </PageSection>
    </Stack>;
}
