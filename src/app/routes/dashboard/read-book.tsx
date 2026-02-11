import type {Route} from "./+types/read-book";

import {type IReactReaderStyle, ReactReader, ReactReaderStyle,} from "react-reader";
import {useEffect, useMemo, useState} from "react";
import {Box, CloseButton, useMediaQuery} from "@chakra-ui/react";
import {Navigate, useNavigate} from "react-router";
import {config} from "@/shared";
import ToastFactory from "@/app/utils/toast_handler";
import {useGetBookByIdQuery} from "@/entities/book";

function getInitialLocation(bookId: string): string | number {
    const savedLocation = JSON.parse(
        localStorage.getItem("currentlyReading") ?? "{}"
    )[bookId];
    return savedLocation ?? 0;
}

export default function ReadBook({params}: Route.ComponentProps) {
    const {bookId} = params;
    const {data: book, error, isLoading} = useGetBookByIdQuery(bookId);

    const navigate = useNavigate();

    const [location, setLocation] = useState<string | number>(getInitialLocation(bookId));

    const readerTheme = useResponsiveReaderTheme();

    useEffect(() => {
        const currentlyReading = JSON.parse(
            localStorage.getItem("currentlyReading") ?? "{}"
        );
        currentlyReading[bookId] = location;
        localStorage.setItem("currentlyReading", JSON.stringify(currentlyReading));
    }, [location]);

    if (isLoading) {
        return null;
    }

    if (error || !book) {
        ToastFactory({message: "Failed to open book", type: "error"});
        return <Navigate to={"/"}/>;
    }

    return (
        <>
            <Box
                h={"100vh"}
                w="100%"
                position={"fixed"}
                top={0}
                left={0}
                zIndex={1000}
            >
                <ReactReader
                    url={`${config.apiUrl}/uploads/books/${book.fileName}`}
                    title={book.title}
                    location={location}
                    locationChanged={setLocation}
                    readerStyles={readerTheme}
                    swipeable={true}
                />
            </Box>
            <CloseButton
                position={"fixed"}
                top={0}
                right={0}
                variant={"plain"}
                onClick={() => navigate(-1)}
                zIndex={1001}
            />
        </>
    );
}

function useResponsiveReaderTheme(): IReactReaderStyle {
    const [isMobile, isMobileHorizontal] = useMediaQuery([
        "(max-width: 768px)",
        "(max-height: 768px)",
    ]);

    const isMobileReaderStyle = {
        width: "80%",
        height: "80%",
    };

    return useMemo(
        () => ({
            ...ReactReaderStyle,
            readerArea: {
                ...ReactReaderStyle.readerArea,
                transition: undefined,
            },
            reader: {
                ...ReactReaderStyle.reader,
                ...((isMobile || isMobileHorizontal) && isMobileReaderStyle),
            },
            container: {
                ...ReactReaderStyle.container,
            },
        }),
        [isMobile]
    );
}
