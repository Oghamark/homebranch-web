import type {Route} from "./+types/book";

import {BookDetailsPage} from "@/pages/bookDetails";
import {useGetBookByIdQuery} from "@/entities/book";
import {Button, Stack} from "@chakra-ui/react";
import {Link} from "react-router";
import {isFetchBaseQueryError} from "@/shared/api/rtk-query";
import {ErrorState, LoadingState, PageHeader} from "@/shared/ui/EditorialUI";

export default function Book({params}: Route.ComponentProps) {
    const {data, isLoading, error, refetch} = useGetBookByIdQuery(params.bookId);
    const unavailable = error && isFetchBaseQueryError(error) && (error.status === 404 || error.status === 403);

    if (error || (!isLoading && !data)) {
        return <Stack maxW="960px" mx="auto" gap={6}>
            <PageHeader title={unavailable ? "This book isn't available" : "We couldn't open this book"}/>
            <ErrorState onRetry={() => refetch()}>
                {unavailable ? "It may have been removed, or you may not have access." : "Your book couldn't be loaded. Please try again."}
            </ErrorState>
            <Button asChild alignSelf="start" minH="44px" variant="outline"><Link to="/library">Back to library</Link></Button>
        </Stack>;
    }

    if (isLoading || !data) return <LoadingState label="Opening your book..."/>;
    return <BookDetailsPage book={data}/>;
}
