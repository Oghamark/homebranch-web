import {DeleteConfirmationDialog} from "@/components/ui/modals/DeleteConfirmationDialog";
import {type BookModel, useDeleteBookMutation, useUpdateBookMutation} from "@/entities/book";
import {config} from "@/shared";
import {Box, Heading, HStack, IconButton, Image, Separator, Stack, Text,} from "@chakra-ui/react";
import {useState} from "react";
import {LuBookOpen, LuHeart, LuX} from "react-icons/lu";
import {Link, useNavigate} from "react-router";
import {ManageBookShelvesButton} from "@/entities/bookShelf";
import {Tooltip} from "@/components/ui/tooltip";

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
        <Box p={4}>
            <HStack align={"start"} gap={6}>
                <Stack w="200px" gap={3}>
                    <Image
                        src={`${config.apiUrl}/uploads/cover-images/${book.coverImageFileName}`}
                        alt={book.title}
                        w="100%"
                        aspectRatio="2/3"
                        objectFit="cover"
                        borderRadius="md"
                    />
                    <HStack justify="center">
                        <DeleteConfirmationDialog
                            title={`Delete book: ${book.title}`}
                            loading={pendingDelete}
                            size="sm"
                            onSubmit={() => {
                                deleteBook(book.id).then(result => !result.error && navigate("/"))
                            }}
                        />
                        <Tooltip content={book.isFavorite ? "Unfavorite" : "Favorite"}>
                            <IconButton
                                variant="subtle"
                                size="sm"
                                onClick={() => updateBook({...book, isFavorite: !book.isFavorite})}
                            >
                                <LuHeart
                                    fill={book.isFavorite ? "red" : "none"}
                                    color={book.isFavorite ? "red" : undefined}
                                />
                            </IconButton>
                        </Tooltip>
                        <ManageBookShelvesButton bookId={book.id} size="sm"/>
                        <Tooltip content="Read">
                            <IconButton variant="subtle" size="sm" asChild>
                                <Link to={`/books/${book.id}/read`}>
                                    <LuBookOpen/>
                                </Link>
                            </IconButton>
                        </Tooltip>
                        {isCurrentlyReading && (
                            <Tooltip content="Stop reading">
                                <IconButton
                                    variant="subtle"
                                    size="sm"
                                    onClick={() => removeCurrentlyReading(book.id)}
                                >
                                    <LuX/>
                                </IconButton>
                            </Tooltip>
                        )}
                    </HStack>
                </Stack>
                <Box flex={1}>
                    <Heading size="2xl">{book.title}</Heading>
                    <Text color="fg.muted" fontSize="md" mt={1}>
                        {book.author}
                    </Text>
                    <Separator my={4}/>
                    <Text fontSize="md" color="fg.muted">
                        Published Year: {book.publishedYear}
                    </Text>
                </Box>
            </HStack>
        </Box>
    );
}
