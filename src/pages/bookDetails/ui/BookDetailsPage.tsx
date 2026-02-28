import {type BookModel, useDeleteBookMutation, useUpdateBookMutation} from "@/entities/book";
import {config} from "@/shared";
import {Box, Button, CloseButton, Dialog, Flex, Heading, IconButton, Image, Menu, Portal, Stack, Text,} from "@chakra-ui/react";
import {useEffect, useState} from "react";
import {LuBookOpen, LuDownload, LuEllipsis, LuHeart, LuLoader, LuTrash2, LuX} from "react-icons/lu";
import {Link, useNavigate} from "react-router";
import {ManageBookShelvesButton} from "@/entities/bookShelf";
import {Tooltip} from "@/components/ui/tooltip";
import {deleteSavedPosition, getSavedPosition} from "@/features/reader/api/savedPositionApi";
import ToastFactory from "@/app/utils/toast_handler";
import {getStoredProgress, removeStoredProgress, clearLocationsCache} from "@/features/reader";

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
    const [deleteOpen, setDeleteOpen] = useState(false);

    const [isCurrentlyReading, setIsCurrentlyReading] = useState(
        isBookOpenedLocally(book.id)
    );

    const [progress, setProgress] = useState<number | undefined>(() => {
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
        clearLocationsCache(bookId);
        setProgress(undefined);
        const currentlyReading = JSON.parse(
            localStorage.getItem(`currentlyReading_${sessionStorage.getItem("user_id")}`) ?? "{}"
        );
        delete currentlyReading[bookId];
        localStorage.setItem(`currentlyReading_${sessionStorage.getItem("user_id")}`, JSON.stringify(currentlyReading));
        setIsCurrentlyReading(false);
    };

    return (
        <Box p={{base: 4, md: 8}}>
            <Flex direction={{base: "column", md: "row"}} align={{base: "center", md: "start"}} gap={{base: 6, md: 10}}>
                {/* Cover image with frosted-glass reading progress overlay */}
                <Box flexShrink={0} position="relative" w={{base: "200px", md: "240px"}}>
                    <Image
                        src={`${config.apiUrl}/uploads/cover-images/${book.coverImageFileName}`}
                        alt={book.title}
                        w="full"
                        aspectRatio="2/3"
                        objectFit="cover"
                        borderRadius="lg"
                        boxShadow="lg"
                        display="block"
                    />
                    {progress !== undefined && progress > 0 && (
                        <Box
                            position="absolute"
                            bottom={0}
                            left={0}
                            right={0}
                            bg="blackAlpha.600"
                            backdropFilter="blur(6px)"
                            borderBottomRadius="lg"
                            px={3}
                            py={2}
                        >
                            <Flex align="center" gap={2}>
                                <Box flex={1} h="2px" bg="whiteAlpha.300" borderRadius="full" overflow="hidden">
                                    <Box
                                        w={`${Math.round(progress * 100)}%`}
                                        h="full"
                                        bg="white"
                                        borderRadius="full"
                                    />
                                </Box>
                                <Text fontSize="xs" color="whiteAlpha.900" fontWeight="medium" flexShrink={0}>
                                    {Math.round(progress * 100)}%
                                </Text>
                            </Flex>
                        </Box>
                    )}
                </Box>

                {/* Book info + actions */}
                <Stack flex={1} gap={4} align={{base: "center", md: "start"}} textAlign={{base: "center", md: "start"}} w="full">
                    {/* Title & author · year */}
                    <Box>
                        <Heading size={{base: "xl", md: "2xl"}} mb={1}>{book.title}</Heading>
                        <Flex align="center" gap={2} color="fg.muted" fontSize="md" justify={{base: "center", md: "start"}} flexWrap="wrap">
                            {book.author && book.author.trim() ? (
                                <Link
                                    to={`/authors/${encodeURIComponent(book.author)}`}
                                    style={{textDecoration: "none", color: "inherit"}}
                                >
                                    <Box as="span" _hover={{textDecoration: "underline"}}>{book.author}</Box>
                                </Link>
                            ) : (
                                <Box as="span">{book.author || "Unknown Author"}</Box>
                            )}
                            {book.publishedYear && (
                                <>
                                    <Text as="span" color="fg.subtle" userSelect="none">·</Text>
                                    <Text as="span" color="fg.subtle">{book.publishedYear}</Text>
                                </>
                            )}
                        </Flex>
                    </Box>

                    {/* Unified action row: labeled CTAs + divider + icon actions */}
                    <Flex align="center" gap={3} flexWrap="wrap" w={{base: "full", md: "auto"}} justify={{base: "center", md: "start"}}>
                        <Button variant="solid" w={{base: "full", md: "auto"}} minW="120px" asChild>
                            <Link to={`/books/${book.id}/read`}>
                                <LuBookOpen/> Read
                            </Link>
                        </Button>
                        <Button variant="outline" w={{base: "full", md: "auto"}} minW="130px" asChild>
                            <a
                                href={`${config.apiUrl}/books/${book.id}/download`}
                                // Replace characters invalid in filenames with underscores
                                download={`${book.title.replace(/[/\\:*?"<>|]/g, '_')}.epub`}
                            >
                                <LuDownload/> Download
                            </a>
                        </Button>
                        {/* Vertical divider hidden on mobile */}
                        <Box display={{base: "none", md: "block"}} w="1px" h="6" bg="border" alignSelf="center" flexShrink={0}/>
                        <Flex gap={1} align="center" justify="center">
                            <Tooltip content={book.isFavorite ? "Unfavorite" : "Favorite"}>
                                <IconButton
                                    variant="ghost"
                                    onClick={() => updateBook({...book, isFavorite: !book.isFavorite})}
                                >
                                    <LuHeart
                                        fill={book.isFavorite ? "red" : "none"}
                                        color={book.isFavorite ? "red" : undefined}
                                    />
                                </IconButton>
                            </Tooltip>
                            <ManageBookShelvesButton bookId={book.id} variant="ghost"/>
                            {/* Overflow menu for destructive / contextual actions */}
                            <Menu.Root>
                                <Menu.Trigger asChild>
                                    <IconButton variant="ghost" aria-label="More options">
                                        <LuEllipsis/>
                                    </IconButton>
                                </Menu.Trigger>
                                <Portal>
                                    <Menu.Positioner>
                                        <Menu.Content>
                                            {isCurrentlyReading && (
                                                <Menu.Item
                                                    value="stop-reading"
                                                    onClick={() => removeCurrentlyReading(book.id)}
                                                >
                                                    <LuX/> Stop reading
                                                </Menu.Item>
                                            )}
                                            <Menu.Item
                                                value="delete"
                                                color="fg.error"
                                                onClick={() => setDeleteOpen(true)}
                                            >
                                                <LuTrash2/> Delete book
                                            </Menu.Item>
                                        </Menu.Content>
                                    </Menu.Positioner>
                                </Portal>
                            </Menu.Root>
                        </Flex>
                    </Flex>
                </Stack>
            </Flex>

            {/* Delete confirmation dialog (controlled) */}
            <Dialog.Root open={deleteOpen} onOpenChange={(e) => setDeleteOpen(e.open)}>
                <Portal>
                    <Dialog.Backdrop/>
                    <Dialog.Positioner>
                        <Dialog.Content p={1} textAlign="center">
                            <Dialog.Header>
                                <Dialog.Title>Delete book: {book.title}</Dialog.Title>
                            </Dialog.Header>
                            <Dialog.Body>Are you sure you want to delete this item?</Dialog.Body>
                            <Dialog.Footer>
                                <Dialog.ActionTrigger asChild>
                                    <Button variant="ghost">Cancel</Button>
                                </Dialog.ActionTrigger>
                                <Button
                                    variant="subtle"
                                    color="fg.error"
                                    disabled={pendingDelete}
                                    onClick={() => deleteBook(book.id).then(result => !result.error && navigate("/"))}
                                >
                                    {pendingDelete ? <LuLoader/> : "Delete"}
                                </Button>
                            </Dialog.Footer>
                            <Dialog.CloseTrigger asChild>
                                <CloseButton/>
                            </Dialog.CloseTrigger>
                        </Dialog.Content>
                    </Dialog.Positioner>
                </Portal>
            </Dialog.Root>
        </Box>
    );
}
