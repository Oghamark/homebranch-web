import type {Route} from "./+types/read-book";

import {fetchBookById} from "@/entities/book";
import {type IReactReaderStyle, ReactReader, ReactReaderStyle,} from "react-reader";
import {useMemo, useState} from "react";
import {Box, CloseButton, useMediaQuery} from "@chakra-ui/react";
import {redirect, useNavigate} from "react-router";
import {config} from "@/shared";
import ToastFactory from "@/app/utils/toast_handler";

export async function clientLoader({params}: Route.LoaderArgs) {
    const {bookId} = params;
    const book = await fetchBookById(bookId);
    if (!book) {
        ToastFactory({message: "Failed to open book", type: "error"});
        return redirect("/");
    }

    return book;
}

function getInitialLocation(bookId: string): string | number {
    const savedLocation = JSON.parse(
        localStorage.getItem("currentlyReading") ?? "{}"
    )[bookId];
    return savedLocation ?? 0;
}

export default function ReadBook({loaderData}: Route.ComponentProps) {
    const {data} = loaderData;
    const navigate = useNavigate();

    const [location, setLocation] = useState<string | number>(
        getInitialLocation(data.id)
    );

    const readerTheme = useResponsiveReaderTheme();

    useMemo(() => {
        const currentlyReading = JSON.parse(
            localStorage.getItem("currentlyReading") ?? "{}"
        );
        currentlyReading[data.id] = location;
        localStorage.setItem("currentlyReading", JSON.stringify(currentlyReading));
    }, [location]);

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
                    url={`${config.backendUrl}/uploads/books/${data.fileName}`}
                    title={data.title}
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
