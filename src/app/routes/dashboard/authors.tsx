import {AuthorGridSkeletons, AuthorsPage} from "@/pages/authors";
import type {Route} from "./+types/authors";
import {Stack} from "@chakra-ui/react";
import {useGetAuthorsInfiniteQuery} from "@/entities/author";
import {CollectionToolbar, useLibrarySearch, useShowAllUsers} from "@/features/library";
import {useMobileNavConfig} from "@/components/navigation/MobileNavContext";
import {ErrorState, PageHeader} from "@/shared/ui/EditorialUI";
import {CollectionEmpty} from "@/pages/library";

export function meta({}: Route.MetaArgs) {
    return [{title: "Homebranch - Authors"}, {name: "description", content: "Browse your library by author"}];
}

export default function Authors() {
    useMobileNavConfig("Authors");
    const query = useLibrarySearch();
    const showAllUsers = useShowAllUsers();
    const userId = showAllUsers ? undefined : (sessionStorage.getItem("user_id") ?? undefined);
    const {currentData: data, hasNextPage, fetchNextPage, isFetching, isError, refetch, isFetchingNextPage} = useGetAuthorsInfiniteQuery({query, userId});
    const authors = data?.pages.flatMap(page => page.data) ?? [];
    const isFetchNextPageError = isError && authors.length > 0;

    return <Stack gap={6}>
        <PageHeader title="Authors" description="Explore the voices behind your books."/>
        <CollectionToolbar label="Search authors" scope display={false}/>
        {isError && !isFetchNextPageError && <ErrorState onRetry={refetch}>Authors could not be loaded.</ErrorState>}
        {isFetching && !data ? <AuthorGridSkeletons/>
            : authors.length ? <AuthorsPage authors={authors} fetchMore={fetchNextPage} hasMore={!!hasNextPage}
                totalAuthors={data?.pages[0]?.total} loadingMore={isFetchingNextPage} loadMoreError={isFetchNextPageError}/>
            : !isError && <CollectionEmpty title={showAllUsers ? "No authors to browse yet" : "No authors in your library yet"} libraryLink>
                Add books to your library to browse their authors here.
            </CollectionEmpty>}
    </Stack>;
}
