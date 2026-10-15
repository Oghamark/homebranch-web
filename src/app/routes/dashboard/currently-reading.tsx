import type {Route} from "./+types/currently-reading";
import {Stack} from "@chakra-ui/react";
import {useMemo} from "react";
import {useGetBooksByIdsQuery} from "@/entities/book";
import {BookGridSkeletons, CollectionEmpty, LibraryPage} from "@/pages/library";
import {CollectionToolbar, useLibraryDisplayMode, useLibrarySearch} from "@/features/library";
import {getStoredProgress, ReadingProgressBadge, StorageIndicator, useStorageLocations} from "@/features/reader";
import {useMobileNavConfig} from "@/components/navigation/MobileNavContext";
import {ErrorState, LoadingState, PageHeader} from "@/shared/ui/EditorialUI";

export function meta({}: Route.MetaArgs) {
    return [{title: "Homebranch - Continue reading"}, {name: "description", content: "Continue your in-progress books"}];
}

export default function CurrentlyReading() {
    useMobileNavConfig("Continue reading");
    const displayMode = useLibraryDisplayMode();
    const ids = useMemo(() => {
        try {
            return Object.keys(JSON.parse(localStorage.getItem(`currentlyReading_${sessionStorage.getItem("user_id")}`) ?? "{}") ?? {});
        } catch {
            return [];
        }
    }, []);
    const progressMap = useMemo(() => {
        const userId = sessionStorage.getItem("user_id");
        if (!userId) return {} as Record<string, number>;
        return ids.reduce((acc, id) => {
            const progress = getStoredProgress(userId, id);
            if (progress !== undefined) acc[id] = progress;
            return acc;
        }, {} as Record<string, number>);
    }, [ids]);
    const {locations, allBookIds, isLoading: discoveryLoading, discoveryError, retry: retryDiscovery} = useStorageLocations(ids);
    const query = useLibrarySearch();
    const {currentData: books, isFetching, isError, refetch} = useGetBooksByIdsQuery({bookIds: allBookIds, query}, {skip: allBookIds.length === 0});

    return <Stack gap={6}>
        <PageHeader title="Continue reading" description="Pick up where you left off."/>
        <CollectionToolbar label="Search in-progress books"/>
        {discoveryLoading && <LoadingState label="Checking saved reading progress..."/>}
        {discoveryError && <ErrorState onRetry={retryDiscovery}>{ids.length
            ? "Cloud reading progress could not be checked. Books saved on this device are still available below."
            : "Cloud reading progress could not be checked. Try again to find your in-progress books."}</ErrorState>}
        {isError && <ErrorState onRetry={refetch}>Your in-progress books could not be loaded.</ErrorState>}
        {isFetching && !books ? <BookGridSkeletons count={ids.length || 6} displayMode={displayMode}/>
            : books?.length ? <LibraryPage books={books} fetchMore={() => {}} hasMore={false} displayMode={displayMode}
                getBookBadge={book => <>
                    {locations[book.id] && <StorageIndicator location={locations[book.id]}/>}
                    {progressMap[book.id] !== undefined && <ReadingProgressBadge percentage={progressMap[book.id]}/>}
                </>}/>
            : !isError && !discoveryError && !discoveryLoading && <CollectionEmpty title="Your next chapter is waiting" libraryLink>Open a book to start reading. Your in-progress books will appear here.</CollectionEmpty>}
    </Stack>;
}
