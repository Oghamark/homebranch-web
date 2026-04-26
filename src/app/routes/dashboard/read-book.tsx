import type {Route} from "./+types/read-book";

import {Flex, Spinner} from "@chakra-ui/react";
import {Navigate, useSearchParams} from "react-router";
import ToastFactory from "@/shared/lib/toast/toast";
import {useGetBookByIdQuery} from "@/entities/book";
import {useColorMode} from "@/shared/ui/color-mode";
import {BookReader} from "@/features/reader";
import {getAvailableBookFormats, getPreferredBookFormat, supportsBookFormatReading, type BookFormatType} from "@/entities/book/model/bookFormats";

export default function ReadBook({params}: Route.ComponentProps) {
    const {bookId} = params;
    const [searchParams] = useSearchParams();
    const {data: book, error, isLoading} = useGetBookByIdQuery(bookId);
    const {colorMode} = useColorMode();
    const isDark = colorMode === "dark";

    const bgColor = isDark ? "#1a202c" : "#ffffff";

    if (isLoading) {
        return (
            <Flex
                h="100dvh"
                w="100%"
                position="fixed"
                top={0}
                left={0}
                zIndex={1000}
                align="center"
                justify="center"
                bg={bgColor}
            >
                <Spinner size="xl" color={isDark ? "#a0aec0" : "#718096"}/>
            </Flex>
        );
    }

    if (error || !book) {
        ToastFactory({message: "Failed to open book", type: "error"});
        return <Navigate to={"/"}/>;
    }

    const availableFormats = getAvailableBookFormats(book);
    const requestedFormat = searchParams.get("format") as BookFormatType | null;
    const selectedFormat = availableFormats.find((format) => format.format === requestedFormat) ?? getPreferredBookFormat(availableFormats);

    if (!selectedFormat) {
        ToastFactory({message: "No available format for this book", type: "error"});
        return <Navigate to={`/books/${book.id}`}/>;
    }

    if (!supportsBookFormatReading(selectedFormat.format)) {
        ToastFactory({message: `Reading is not available for ${selectedFormat.format} yet`, type: "warning"});
        return <Navigate to={`/books/${book.id}`}/>;
    }

    return <BookReader book={book} format={selectedFormat.format}/>;
}
