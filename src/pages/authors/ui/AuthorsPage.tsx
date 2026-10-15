import {AuthorCard, AuthorCardSkeleton, type AuthorModel} from "@/entities/author";
import {Button, For, Grid, Stack, Text} from "@chakra-ui/react";
import InfiniteScroll from "react-infinite-scroll-component";
import {ErrorState, LoadingState} from "@/shared/ui/EditorialUI";

interface AuthorsPageProps {
    authors: AuthorModel[];
    hasMore: boolean;
    totalAuthors?: number;
    fetchMore: () => void;
    loadingMore?: boolean;
    loadMoreError?: boolean;
}

export function AuthorGridSkeletons({count = 12}: { count?: number } = {}) {
    return (
        <Grid gridTemplateColumns={{base: "repeat(2, minmax(0, 1fr))", sm: "repeat(auto-fill, minmax(160px, 1fr))"}} gap={6} p={1} role="status" aria-label="Loading authors">
            {Array.from({length: count}).map((_, index) => (
                <AuthorCardSkeleton key={index}/>
            ))}
        </Grid>
    );
}

export function AuthorsPage({authors, hasMore, totalAuthors, fetchMore, loadingMore = false, loadMoreError = false}: AuthorsPageProps) {
    return <Stack gap={4}>
        <Text fontSize="sm" color="fg.muted" role="status">{authors.length}{totalAuthors != null ? ` of ${totalAuthors}` : ""} authors</Text>
        <InfiniteScroll
            next={fetchMore}
            hasMore={hasMore && !loadMoreError && authors.length > 0}
            loader={null}
            dataLength={authors.length}
            style={{overflow: "visible"}}
        >
            <Grid gridTemplateColumns={{base: "repeat(2, minmax(0, 1fr))", sm: "repeat(auto-fill, minmax(160px, 1fr))"}} gap={6} p={1} pb={3}>
                <For each={authors}>
                    {(author, _index) => (
                        <AuthorCard key={author.name} author={author}/>
                    )}
                </For>
            </Grid>
        </InfiniteScroll>
        {loadingMore && <LoadingState label="Loading more authors..."/>}
        {loadMoreError && <ErrorState onRetry={fetchMore}>More authors could not be loaded. Your current results are still here.</ErrorState>}
        {hasMore && !loadingMore && !loadMoreError && <Button variant="outline" minH="44px" alignSelf="center" onClick={fetchMore}>Load more authors</Button>}
    </Stack>;
}
