import type {Route} from "./+types/read-book";

import {Flex, Spinner} from "@chakra-ui/react";
import {Navigate} from "react-router";
import ToastFactory from "@/app/utils/toast_handler";
import {useGetBookByIdQuery} from "@/entities/book";
import {useColorMode} from "@/components/ui/color-mode";
import {Reader} from "@/features/reader";

export default function ReadBook({params}: Route.ComponentProps) {
    const {bookId} = params;
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

    return <Reader book={book}/>;
}
