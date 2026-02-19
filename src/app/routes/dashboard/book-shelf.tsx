import {useEffect, useMemo} from "react";
import {Box, Heading, HStack, Loader, Stack} from "@chakra-ui/react";
import {Navigate, useParams} from "react-router";
import {
    ManageBookShelfBooksButton,
    useGetBookShelfBooksInfiniteQuery,
    useGetBookShelfByIdQuery
} from "@/entities/bookShelf";
import {LibraryPage} from "@/pages/library";
import type {Route} from "./+types/book-shelf";
import ToastFactory from "@/app/utils/toast_handler";
import {HiCollection} from "react-icons/hi";
import {useLibrarySearch} from "@/features/library";
import {useMobileNav} from "@/components/navigation/MobileNavContext";

export function meta({}: Route.MetaArgs) {
    return [
        {title: "Homebranch - Book Shelf"},
        {name: "description", content: "View books on a shelf"},
    ];
}

export default function BookShelf() {
    const {bookShelfId} = useParams();
    if (!bookShelfId) return null;
    return <BookShelfContent key={bookShelfId} bookShelfId={bookShelfId}/>;
}

function BookShelfContent({bookShelfId}: { bookShelfId: string }) {
    const query = useLibrarySearch()
    const {data, isLoading, hasNextPage, fetchNextPage} = useGetBookShelfBooksInfiniteQuery({
        bookShelfId,
        query
    });
    const {data: bookShelf, isLoading: isLoadingBookShelf} = useGetBookShelfByIdQuery(bookShelfId);
    const {setTitle, setRightAction} = useMobileNav();

    useEffect(() => {
        if (bookShelf) {
            setTitle(bookShelf.title);
            setRightAction(<ManageBookShelfBooksButton bookShelf={bookShelf}/>);
        }
        return () => {
            setTitle(null);
            setRightAction(null);
        };
    }, [bookShelf]);

    const books = useMemo(() => {
        return data?.pages.flatMap(page => page.data) ?? []
    }, [data])

    const bookIds = useMemo(() => books.map(b => b.id), [books]);
    const filteredBooks = useMemo(() => books.filter(book => book.title.toLowerCase().includes(query.toLowerCase())), [books, query])

    if (isLoading || isLoadingBookShelf) {
        return <Loader/>;
    }

    if (!bookShelf) {
        ToastFactory({message: "Book Shelf Not Found", type: "error"})
        return <Navigate to={`/`}/>
    }

    return (
        <Stack justify={"space-evenly"} height={"100%"}>
            <HStack display={{base: "none", md: "flex"}}>
                <Heading>{bookShelf.title}</Heading>
                <ManageBookShelfBooksButton bookShelf={bookShelf}/>
            </HStack>
            {bookIds.length === 0 ? _noBooks() :
                <Box flex={1}>
                    <LibraryPage
                        books={filteredBooks}
                        fetchMore={fetchNextPage}
                        hasMore={hasNextPage}
                    />
                </Box>
            }
        </Stack>
    );
}

function _noBooks() {
    return (
        <Stack
            flex={1}
            alignItems={"center"}
            justifyContent={"center"}
            gap={1}
        >
            <Heading>This shelf is empty!</Heading>
            <HStack gap={1}>
                <Heading size={"md"}>Press</Heading>
                <HiCollection/>
                <Heading size={"md"}>to get started.</Heading>
            </HStack>
        </Stack>
    )
}

