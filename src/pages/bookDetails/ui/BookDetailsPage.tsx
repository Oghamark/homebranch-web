import {DeleteConfirmationDialog} from "@/components/ui/modals/DeleteConfirmationDialog";
import {type BookModel, useDeleteBookMutation, useUpdateBookMutation} from "@/entities/book";
import {config} from "@/shared";
import {Box, Heading, HStack, IconButton, Image, Separator, Text,} from "@chakra-ui/react";
import {useState} from "react";
import {HiBookOpen, HiHeart, HiX} from "react-icons/hi";
import {Link, useNavigate} from "react-router";

export interface BookDetailsPageProps {
    book: BookModel
}

function isBookOpened(bookId: string): Boolean {
    const currentlyReading = JSON.parse(
        localStorage.getItem("currentlyReading") ?? "{}"
    );
    return Boolean(currentlyReading[bookId]);
}

export default function BookDetailsPage({book}: BookDetailsPageProps) {
    const [updateBook] = useUpdateBookMutation();
    const [deleteBook, {isLoading: pendingDelete}] = useDeleteBookMutation();
    const navigate = useNavigate();

    const [isCurrentlyReading, setIsCurrentlyReading] = useState(
        isBookOpened(book.id)
    );

    const removeCurrentlyReading = (bookId: string) => {
        const currentlyReading = JSON.parse(
            localStorage.getItem("currentlyReading") ?? "{}"
        );
        delete currentlyReading[bookId];
        localStorage.setItem("currentlyReading", JSON.stringify(currentlyReading));
        setIsCurrentlyReading(false);
    };

    return (
        <>
            <Box p={4}>
                <HStack align={"start"}>
                    <Box>
                        <Image
                            src={`${config.apiUrl}/uploads/cover-images/${book.coverImageFileName}`}
                            alt={book.title}
                            w={"200px"}
                        />
                        <HStack mt={2}>
                            <DeleteConfirmationDialog
                                title={`Delete book: ${book.title}`}
                                loading={pendingDelete}
                                onSubmit={() => {
                                    deleteBook(book.id).then(result => !result.error && navigate("/"))
                                }}
                            />
                            {/*TODO: Implement edit book functionality */}
                            {/* <IconButton variant={"subtle"}>
              <HiPencil />
            </IconButton> */}
                            <IconButton variant={"subtle"}
                                        onClick={() => updateBook({...book, isFavorite: !book.isFavorite})}>
                                <HiHeart color={book.isFavorite ? "red" : undefined}/>
                            </IconButton>
                            <IconButton variant={"subtle"} asChild>
                                <Link to={`/books/${book.id}/read`}>
                                    <HiBookOpen/>
                                </Link>
                            </IconButton>
                            {isCurrentlyReading && (
                                <IconButton
                                    variant={"subtle"}
                                    onClick={() => removeCurrentlyReading(book.id)}
                                >
                                    <HiX/>
                                </IconButton>
                            )}
                        </HStack>
                    </Box>
                    <Box p={4} flex={1}>
                        <Heading>{book.title}</Heading>
                        <Text color={"GrayText"} fontSize={"sm"}>
                            {book.author}
                        </Text>
                        <Separator my={4}/>
                        <Text fontSize={"md"}>Published Year: {book.publishedYear}</Text>
                    </Box>
                </HStack>
            </Box>
        </>
    );
}
