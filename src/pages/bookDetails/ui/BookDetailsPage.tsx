import {DeleteConfirmationDialog} from "@/components/ui/modals/DeleteConfirmationDialog";
import {type BookModel, useDeleteBookMutation, useUpdateBookMutation} from "@/entities/book";
import {config} from "@/shared";
import {Box, Flex, Heading, IconButton, Image, Progress, Separator, Stack, Text,} from "@chakra-ui/react";
import {useEffect, useState} from "react";
import {LuBookOpen, LuHeart, LuX} from "react-icons/lu";
import {Link, useNavigate} from "react-router";
import {ManageBookShelvesButton} from "@/entities/bookShelf";
import {Tooltip} from "@/components/ui/tooltip";
import {deleteSavedPosition, getSavedPosition} from "@/features/reader/api/savedPositionApi";
import ToastFactory from "@/app/utils/toast_handler";
import {getStoredProgress, removeStoredProgress} from "@/features/reader";

export interface BookDetailsPageProps {
    book: BookModel
}

function isBookOpenedLocally(bookId: string): boolean {
    if (typeof window === "undefined") return false;
    const currentlyReading = JSON.parse(
        localStorage.getItem(`currentlyReading_${sessionStorage.getItem("user_id")}`) ?? "{}"
    );
    return Boolean(currentlyReading[bookId]);
}

export default function BookDetailsPage({book}: BookDetailsPageProps) {
    const [updateBook] = useUpdateBookMutation();
    const [deleteBook, {isLoading: pendingDelete}] = useDeleteBookMutation();
    const navigate = useNavigate();

    const [isCurrentlyReading, setIsCurrentlyReading] = useState(
        isBookOpenedLocally(book.id)
    );

    const [progress] = useState<number | undefined>(() => {
        const userId = sessionStorage.getItem("user_id");
        if (!userId) return undefined;
        return getStoredProgress(userId, book.id);
    });

    useEffect(() => {
        if (isCurrentlyReading) return;
        let cancelled = false;
        getSavedPosition(book.id)
            .then((pos) => {
                if (!cancelled && pos) setIsCurrentlyReading(true);
            })
            .catch(() => {});
        return () => { cancelled = true; };
    }, [book.id, isCurrentlyReading]);

    const removeCurrentlyReading = async (bookId: string) => {
        try {
            await deleteSavedPosition(bookId);
        } catch {
            ToastFactory({message: "Failed to remove cloud reading position", type: "error"});
            return;
        }
        const userId = sessionStorage.getItem("user_id");
        if (userId) removeStoredProgress(userId, bookId);
        const currentlyReading = JSON.parse(
            localStorage.getItem(`currentlyReading_${sessionStorage.getItem("user_id")}`) ?? "{}"
        );
        delete currentlyReading[bookId];
        localStorage.setItem(`currentlyReading_${sessionStorage.getItem("user_id")}`, JSON.stringify(currentlyReading));
        setIsCurrentlyReading(false);
    };

    return (
        <Box p={4}>
            <Flex direction={{base: "column", md: "row"}} align={{base: "center", md: "start"}} gap={6}>
                <Stack w={{base: "160px", md: "200px"}} gap={3} flexShrink={0}>
                    <Image
                        src={`${config.apiUrl}/uploads/cover-images/${book.coverImageFileName}`}
                        alt={book.title}
                        w="100%"
                        aspectRatio="2/3"
                        objectFit="cover"
                        borderRadius="md"
                    />
                    <Flex justify={{base: "start", md: "center"}} wrap="wrap" gap={1}>
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
                    </Flex>
                </Stack>
                <Box flex={1}>
                    <Heading size={{base: "xl", md: "2xl"}}>{book.title}</Heading>
                    <Text color="fg.muted" fontSize="md" mt={1}>
                        {book.author}
                    </Text>
                    <Separator my={4}/>
                    <Text fontSize="md" color="fg.muted">
                        Published Year: {book.publishedYear}
                    </Text>
                    {progress !== undefined && (
                        <Box mt={4}>
                            <Text fontSize="sm" color="fg.muted" mb={1}>
                                Reading Progress — {Math.round(progress * 100)}%
                            </Text>
                            <Progress.Root
                                value={Math.round(progress * 100)}
                                maxW="300px"
                                size="sm"
                            >
                                <Progress.Track>
                                    <Progress.Range/>
                                </Progress.Track>
                            </Progress.Root>
                        </Box>
                    )}
                </Box>
            </Flex>
        </Box>
    );
}
