import {AuthorCard, AuthorCardSkeleton, type AuthorModel} from "@/entities/author";
import {For, Grid} from "@chakra-ui/react";
import InfiniteScroll from "react-infinite-scroll-component";

interface AuthorsPageProps {
    authors: AuthorModel[];
    hasMore: boolean;
    totalAuthors?: number;
    fetchMore: () => void;
}

export function AuthorGridSkeletons({count = 12}: { count?: number } = {}) {
    return (
        <Grid gridTemplateColumns="repeat(auto-fill, minmax(200px, 1fr))" gap={4} p={1}>
            {Array.from({length: count}).map((_, index) => (
                <AuthorCardSkeleton key={index}/>
            ))}
        </Grid>
    );
}

export function AuthorsPage({authors, hasMore, totalAuthors, fetchMore}: AuthorsPageProps) {
    const remaining = totalAuthors != null ? Math.max(totalAuthors - authors.length, 0) : 12;

    return (
        <InfiniteScroll
            next={fetchMore}
            hasMore={hasMore && authors.length > 0}
            loader={<AuthorGridSkeletons count={remaining}/>}
            dataLength={authors.length}
        >
            <Grid gridTemplateColumns="repeat(auto-fill, minmax(200px, 1fr))" gap={4} p={1} pb={3}>
                <For each={authors}>
                    {(author, _index) => (
                        <AuthorCard author={author}/>
                    )}
                </For>
            </Grid>
        </InfiniteScroll>
    );
}
