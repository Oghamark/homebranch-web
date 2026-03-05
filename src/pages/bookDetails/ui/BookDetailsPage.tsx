import {type BookModel, useDeleteBookMutation, useGenerateBookSummaryMutation, useUpdateBookMutation, useFetchBookMetadataMutation} from "@/entities/book";
import {config} from "@/shared";
import {Badge, Box, Button, CloseButton, Dialog, Flex, Heading, IconButton, Image, Menu, Portal, SimpleGrid, Stack, Text,} from "@chakra-ui/react";
import {useEffect, useState} from "react";
import {LuBookOpen, LuDownload, LuEllipsis, LuHeart, LuLibrary, LuLoader, LuRefreshCw, LuStar, LuTrash2, LuX} from "react-icons/lu";
import {Link, useNavigate} from "react-router";
import {ManageBookShelvesButton} from "@/entities/bookShelf";
import {Tooltip} from "@/components/ui/tooltip";
import {deleteSavedPosition, getSavedPosition} from "@/features/reader/api/savedPositionApi";
import ToastFactory from "@/app/utils/toast_handler";
import {handleRtkError} from "@/shared/api/rtk-query";
import {getStoredProgress, removeStoredProgress, clearLocationsCache} from "@/features/reader";

const SUMMARY_CHAR_LIMIT = 400;

function StarRating({value, count}: { value: number; count?: number }) {
    const full = Math.floor(value);
    const half = value - full >= 0.5;
    const stars = Array.from({length: 5}, (_, i) => {
        if (i < full) return 'full';
        if (i === full && half) return 'half';
        return 'empty';
    });
    return (
        <Flex align="center" gap={1}>
            {stars.map((s, i) => (
                <LuStar
                    key={i}
                    size={14}
                    fill={s === 'full' ? 'currentColor' : s === 'half' ? 'url(#half)' : 'none'}
                    color={s === 'empty' ? 'var(--chakra-colors-fg-subtle)' : 'orange'}
                />
            ))}
            <Text fontSize="sm" color="fg.muted">{value.toFixed(1)}{count != null ? ` (${count.toLocaleString()})` : ''}</Text>
        </Flex>
    );
}

function MetaItem({label, value}: { label: string; value: string }) {
    return (
        <Box>
            <Text fontSize="xs" color="fg.subtle" textTransform="uppercase" letterSpacing="wide" mb="1px">{label}</Text>
            <Text fontSize="sm">{value}</Text>
        </Box>
    );
}

function Summary({html}: { html: string }) {
    const [expanded, setExpanded] = useState(false);
    const isLong = html.length > SUMMARY_CHAR_LIMIT;

    return (
        <Box>
            <Box
                maxH={isLong && !expanded ? "7.5em" : undefined}
                overflow="hidden"
                color="fg.muted"
                fontSize="sm"
                lineHeight="tall"
                css={{
                    "& p": {marginBottom: "0.5em"},
                    "& p:last-child": {marginBottom: 0},
                }}
                dangerouslySetInnerHTML={{__html: html}}
            />
            {isLong && (
                <Button variant="plain" size="xs" color="fg.subtle" px={0} mt={1}
                        onClick={() => setExpanded(e => !e)}>
                    {expanded ? "Show less" : "Read more"}
                </Button>
            )}
        </Box>
    );
}

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
    const [generateSummary, {isLoading: generatingSummary}] = useGenerateBookSummaryMutation();
    const [fetchMetadata, {isLoading: fetchingMetadata}] = useFetchBookMetadataMutation();
    const navigate = useNavigate();
    const [deleteOpen, setDeleteOpen] = useState(false);

    const currentUserId = sessionStorage.getItem('user_id');
    const currentUserRole = sessionStorage.getItem('user_role');
    const canDelete = currentUserRole === 'ADMIN' || currentUserId === book.uploadedByUserId;

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
                    {/* Title & author · year · series */}
                    <Box>
                        <Heading size={{base: "xl", md: "2xl"}} mb={1}>{book.title}</Heading>
                        {book.series && (
                            <Text fontSize="sm" color="fg.muted" mb={1}>
                                {book.series}{book.seriesPosition != null ? ` #${book.seriesPosition}` : ''}
                            </Text>
                        )}
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
                        {book.averageRating != null && (
                            <Box mt={1}>
                                <StarRating value={book.averageRating} count={book.ratingsCount}/>
                            </Box>
                        )}
                    </Box>

                    {book.summary && book.summary.trim() ? (
                        <Summary html={book.summary}/>
                    ) : (
                        <Button
                            variant="subtle"
                            size="sm"
                            onClick={() =>
                                generateSummary(book.id)
                                    .unwrap()
                                    .then(result => {
                                        if (!result.summary?.trim()) {
                                            ToastFactory({message: "No summary could be found on Open Library for this book.", type: "info"});
                                        }
                                    })
                                    .catch(handleRtkError)
                            }
                            loading={generatingSummary}
                        >
                            <LuLibrary/> Look up summary on Open Library
                        </Button>
                    )}

                    {/* Genres */}
                    {book.genres && book.genres.filter(g => g.trim()).length > 0 && (
                        <Flex gap={2} flexWrap="wrap">
                            {book.genres.filter(g => g.trim()).map(genre => (
                                <Badge key={genre} variant="subtle" colorPalette="teal" size="sm">{genre}</Badge>
                            ))}
                        </Flex>
                    )}

                    {/* Metadata grid */}
                    {(book.isbn || book.pageCount || book.publisher || book.language) && (
                        <SimpleGrid columns={{base: 2, md: 3}} gap={4} pt={1}>
                            {book.isbn && <MetaItem label="ISBN" value={book.isbn}/>}
                            {book.pageCount && <MetaItem label="Pages" value={String(book.pageCount)}/>}
                            {book.publisher && <MetaItem label="Publisher" value={book.publisher}/>}
                            {book.language && <MetaItem label="Language" value={book.language.toUpperCase()}/>}
                        </SimpleGrid>
                    )}

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
                                                value="refresh-metadata"
                                                onClick={() =>
                                                    fetchMetadata(book.id)
                                                        .unwrap()
                                                        .then(() => ToastFactory({message: "Metadata refreshed", type: "success"}))
                                                        .catch(handleRtkError)
                                                }
                                                disabled={fetchingMetadata}
                                            >
                                                <LuRefreshCw/> Refresh metadata
                                            </Menu.Item>
                                            {canDelete && (
                                                <Menu.Item
                                                    value="delete"
                                                    color="fg.error"
                                                    onClick={() => setDeleteOpen(true)}
                                                >
                                                    <LuTrash2/> Delete book
                                                </Menu.Item>
                                            )}
                                        </Menu.Content>
                                    </Menu.Positioner>
                                </Portal>
                            </Menu.Root>
                        </Flex>
                    </Flex>
                    {/* Metadata last fetched */}
                    {book.metadataFetchedAt && (
                        <Text fontSize="xs" color="fg.subtle">
                            Metadata last enriched {new Date(book.metadataFetchedAt).toLocaleDateString()}
                        </Text>
                    )}
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
