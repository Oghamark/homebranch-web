import {
    type BookModel,
    useDeleteBookMutation,
    useGenerateBookSummaryMutation,
    useFetchBookMetadataMutation,
    useSearchBookCoversMutation,
    useSelectBookCoverMutation,
    type BookCoverCandidate,
    useToggleFavoriteMutation,
} from "@/entities/book";
import {config} from "@/shared";
import {Badge, Box, Button, CloseButton, Dialog, Flex, Image, Input, Portal, SimpleGrid, Spinner, Stack, Text,} from "@chakra-ui/react";
import {useEffect, useMemo, useState} from "react";
import {LuBookOpen, LuDownload, LuHeart, LuImagePlus, LuLibrary, LuRefreshCw, LuSearch, LuSend, LuStar} from "react-icons/lu";
import {Link, useNavigate} from "react-router";
import {ManageBookShelvesButton} from "@/entities/bookShelf";
import {BookJacket, ConfirmAction, EmptyState, ErrorState, PageHeader, PageSection} from "@/shared/ui/EditorialUI";
import {deleteSavedPosition, getSavedPosition} from "@/features/reader/api/savedPositionApi";
import ToastFactory from "@/shared/lib/toast/toast";
import {handleRtkError} from "@/shared/api/rtk-query";
import {getStoredProgress, removeStoredProgress} from "@/features/reader";
import {
    getAvailableBookFormats,
    getBookFormatExtension,
    getBookFormatLabel,
    getPreferredBookFormat,
    supportsBookFormatReading,
    type BookFormatType
} from "@/entities/book/model/bookFormats";
import {getApiErrorMessage, useGetKindleEmailQuery, useGetMailSenderQuery, useSendToKindleMutation} from "@/entities/kindle";
import {ManageBookFormatsButton} from "@/pages/bookDetails/ui/ManageBookFormatsButton";

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
            <Text fontSize="xs" color="fg.muted" textTransform="uppercase" letterSpacing="wide" mb="1px">{label}</Text>
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
                <Button variant="plain" minH="44px" size="xs" color="fg.muted" px={0} mt={1}
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
    const [toggleFavorite, {isLoading: favoriting}] = useToggleFavoriteMutation();
    const [deleteBook] = useDeleteBookMutation();
    const [generateSummary, {isLoading: generatingSummary}] = useGenerateBookSummaryMutation();
    const [fetchMetadata, {isLoading: fetchingMetadata}] = useFetchBookMetadataMutation();
    const navigate = useNavigate();
    const {data: mailSender} = useGetMailSenderQuery();
    const {data: kindlePreference, isLoading: loadingKindle, isError: kindleFailed, refetch: retryKindle} = useGetKindleEmailQuery(undefined, {skip: !mailSender?.configured});
    const [sendToKindle, {isLoading: sendingToKindle}] = useSendToKindleMutation();
    const [actionError, setActionError] = useState("");
    const [coverError, setCoverError] = useState("");
    const [coverFailed, setCoverFailed] = useState(false);
    const [coverSearchOpen, setCoverSearchOpen] = useState(false);
    const [coverSearchQuery, setCoverSearchQuery] = useState("");
    const [coverCandidates, setCoverCandidates] = useState<BookCoverCandidate[]>([]);
    const [searchCovers, {isLoading: searchingCovers}] = useSearchBookCoversMutation();
    const [selectCover, {isLoading: selectingCover}] = useSelectBookCoverMutation();
    const availableFormats = useMemo(() => getAvailableBookFormats(book), [book]);
    const preferredFormat = useMemo(() => getPreferredBookFormat(availableFormats), [availableFormats]);
    const [selectedFormat, setSelectedFormat] = useState<BookFormatType | undefined>(preferredFormat?.format);

    useEffect(() => {
        setSelectedFormat(preferredFormat?.format);
    }, [preferredFormat?.format]);

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

    const activeFormat = availableFormats.find((format) => format.format === selectedFormat) ?? preferredFormat;
    const canSendToKindle = Boolean(mailSender?.configured) && availableFormats.some((format) => format.format === "EPUB");

    const handleSendToKindle = async () => {
        if (!kindlePreference?.kindleEmail) {
            ToastFactory({message: "Add your Kindle email in Settings first", type: "error"});
            navigate("/settings?section=kindle");
            return;
        }
        try {
            await sendToKindle(book.id).unwrap();
            ToastFactory({message: `Sent to ${kindlePreference.kindleEmail}`, type: "success"});
        } catch (error) {
            setActionError(getApiErrorMessage(error));
            ToastFactory({message: getApiErrorMessage(error), type: "error"});
        }
    };

    const openCoverSearch = async () => {
        if (coverSearchQuery) {
            setCoverSearchOpen(true);
            return;
        }
        const query = `${book.title} ${book.author}`.trim();
        setCoverSearchQuery(query);
        setCoverSearchOpen(true);
        setCoverError("");
        try {
            setCoverCandidates(await searchCovers({bookId: book.id, query}).unwrap());
        } catch (error) {
            setCoverError("Covers could not be loaded. Try searching again.");
            handleRtkError(error);
        }
    };

    const submitCoverSearch = async (event: {preventDefault: () => void}) => {
        event.preventDefault();
        setCoverError("");
        try {
            setCoverCandidates(await searchCovers({bookId: book.id, query: coverSearchQuery}).unwrap());
        } catch (error) {
            setCoverError("Covers could not be loaded. Your search has been kept.");
            handleRtkError(error);
        }
    };

    const handleSelectCover = async (candidate: BookCoverCandidate) => {
        setCoverError("");
        try {
            await selectCover({bookId: book.id, coverId: candidate.coverId}).unwrap();
            setCoverSearchOpen(false);
            ToastFactory({message: "Book cover updated", type: "success"});
        } catch (error) {
            setCoverError("This cover could not be saved. Please try again.");
            handleRtkError(error);
        }
    };
    const canReadActiveFormat = activeFormat ? supportsBookFormatReading(activeFormat.format) : false;
    const isAudioFormat = activeFormat?.format === "MP3" || activeFormat?.format === "M4B";
    const activeTitle = activeFormat?.title ?? book.title;
    const activeAuthor = activeFormat?.author ?? book.author;
    const activeGenres = activeFormat?.genres ?? book.genres;
    const activePublishedYear = activeFormat?.publishedYear ?? book.publishedYear;
    const activeCoverImageFileName = book.coverImageFileName ?? activeFormat?.coverImageFileName;
    useEffect(() => setCoverFailed(false), [activeCoverImageFileName]);
    const activeSummary = activeFormat?.summary ?? book.summary;
    const activeSeries = activeFormat?.series ?? book.series;
    const activeSeriesPosition = activeFormat?.seriesPosition ?? book.seriesPosition;
    const activeIsbn = activeFormat?.isbn ?? book.isbn;
    const activePageCount = activeFormat?.pageCount ?? book.pageCount;
    const activePublisher = activeFormat?.publisher ?? book.publisher;
    const activeLanguage = activeFormat?.language ?? book.language;
    const sanitizedTitle = activeTitle.replace(/[/\\:*?"<>|]/g, '_');

    const removeCurrentlyReading = async (bookId: string) => {
        try {
            await deleteSavedPosition(bookId);
        } catch {
            ToastFactory({message: "Failed to remove cloud reading position", type: "error"});
            throw new Error("Cloud reading position could not be removed");
        }
        const userId = sessionStorage.getItem("user_id");
        if (userId) removeStoredProgress(userId, bookId);
        setProgress(undefined);
        const currentlyReading = JSON.parse(
            localStorage.getItem(`currentlyReading_${sessionStorage.getItem("user_id")}`) ?? "{}"
        );
        delete currentlyReading[bookId];
        localStorage.setItem(`currentlyReading_${sessionStorage.getItem("user_id")}`, JSON.stringify(currentlyReading));
        setIsCurrentlyReading(false);
    };

    return (
        <Stack gap={8} maxW="1100px" mx="auto" p={{base: 4, md: 8}}>
            <Flex direction={{base: "column", md: "row"}} align={{base: "center", md: "start"}} gap={{base: 6, md: 10}}>
                {/* Cover image with frosted-glass reading progress overlay */}
                <Box flexShrink={0} position="relative" w={{base: "200px", md: "240px"}}>
                    {activeCoverImageFileName && !coverFailed ? (
                        <Image
                            src={`${config.apiUrl}/uploads/cover-images/${activeCoverImageFileName}`}
                            alt={activeTitle}
                            w="full"
                            aspectRatio="2/3"
                            objectFit="cover"
                            borderRadius="lg"
                            boxShadow="lg"
                            display="block"
                            onError={() => setCoverFailed(true)}
                        />
                    ) : (
                        <BookJacket title={activeTitle} author={activeAuthor}/>
                    )}
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
                        <PageHeader title={activeTitle}/>
                        {activeSeries && (
                            <Text fontSize="sm" color="fg.muted" mb={1}>
                                {activeSeries}{activeSeriesPosition != null ? ` #${activeSeriesPosition}` : ''}
                            </Text>
                        )}
                        <Flex align="center" gap={2} color="fg.muted" fontSize="md" justify={{base: "center", md: "start"}} flexWrap="wrap">
                            {activeAuthor && activeAuthor.trim() ? (
                                <Link
                                    to={`/authors/${encodeURIComponent(activeAuthor)}`}
                                    style={{textDecoration: "none", color: "inherit"}}
                                >
                                    <Box as="span" _hover={{textDecoration: "underline"}}>{activeAuthor}</Box>
                                </Link>
                            ) : (
                                <Box as="span">{activeAuthor || "Unknown Author"}</Box>
                            )}
                            {activePublishedYear && (
                                <>
                                    <Text as="span" color="fg.muted" userSelect="none">·</Text>
                                    <Text as="span" color="fg.muted">{activePublishedYear}</Text>
                                </>
                            )}
                        </Flex>
                        {book.averageRating != null && (
                            <Box mt={1}>
                                <StarRating value={book.averageRating} count={book.ratingsCount}/>
                            </Box>
                        )}
                    </Box>

                    {/* Genres */}
                    {activeGenres && activeGenres.filter(g => g.trim()).length > 0 && (
                        <Flex gap={2} flexWrap="wrap">
                            {activeGenres.filter(g => g.trim()).map(genre => (
                                <Badge key={genre} variant="subtle" colorPalette="teal" size="sm">{genre}</Badge>
                            ))}
                        </Flex>
                    )}

                    {/* Unified action row: labeled CTAs + divider + icon actions */}
                    {availableFormats.length > 0 && (
                        <Stack gap={2} align={{base: "center", md: "start"}}>
                            <Text fontSize="xs" color="fg.muted" textTransform="uppercase" letterSpacing="wide">Available formats</Text>
                            <Flex gap={2} flexWrap="wrap" justify={{base: "center", md: "start"}}>
                                {availableFormats.map((format) => (
                                    <Button
                                        key={format.id}
                                        size="sm"
                                        minH="44px"
                                        variant={activeFormat?.format === format.format ? "solid" : "outline"}
                                        aria-pressed={activeFormat?.format === format.format}
                                        onClick={() => setSelectedFormat(format.format)}
                                    >
                                        {getBookFormatLabel(format.format)}
                                    </Button>
                                ))}
                            </Flex>
                        </Stack>
                    )}
                    <Flex align="center" gap={3} flexWrap="wrap" w={{base: "full", md: "auto"}} justify={{base: "center", md: "start"}}>
                        {canReadActiveFormat ? (
                            <Button variant="solid" minH="44px" colorPalette="orange" w={{base: "full", md: "auto"}} minW="120px" asChild>
                                <Link to={`/books/${book.id}/read${activeFormat ? `?format=${activeFormat.format}` : ''}`}>
                                    <LuBookOpen/> {isAudioFormat ? "Listen" : isCurrentlyReading ? "Continue reading" : "Read"}
                                </Link>
                            </Button>
                        ) : (
                            <Button variant="solid" w={{base: "full", md: "auto"}} minW="120px" disabled>
                                <LuBookOpen/> Read unavailable
                            </Button>
                        )}
                    </Flex>
                    <Flex align="center" gap={3} flexWrap="wrap" justify={{base: "center", md: "start"}}>
                        <Button variant="outline" minH="44px" w={{base: "full", md: "auto"}} minW="130px" asChild>
                            <a
                                href={`${config.apiUrl}/books/${book.id}/download${activeFormat ? `?format=${activeFormat.format}` : ''}`}
                                download={`${sanitizedTitle}${getBookFormatExtension(activeFormat?.format ?? "EPUB")}`}
                            >
                                <LuDownload/> Download
                            </a>
                        </Button>
                        {canSendToKindle && (
                            <Button variant="outline" minH="44px" w={{base: "full", md: "auto"}} minW="150px"
                                    onClick={handleSendToKindle} loading={sendingToKindle || loadingKindle}
                                    loadingText={loadingKindle ? "Checking Kindle settings" : "Send to Kindle"}
                                    disabled={kindleFailed}>
                                <LuSend/> {kindlePreference?.kindleEmail ? "Send to Kindle" : "Set up Kindle"}
                            </Button>
                        )}
                        <Button variant="outline" minH="44px" aria-pressed={book.isFavorite} loading={favoriting}
                            onClick={async () => {
                                setActionError("");
                                try { await toggleFavorite(book.id).unwrap(); }
                                catch { setActionError("Your favorite could not be updated. Please try again."); }
                            }}>
                            <LuHeart fill={book.isFavorite ? "currentColor" : "none"}/>{book.isFavorite ? "Favorited" : "Favorite"}
                        </Button>
                        <ManageBookShelvesButton bookId={book.id} variant="outline" showLabel/>
                    </Flex>
                    {canSendToKindle && kindleFailed && <ErrorState onRetry={retryKindle}>Your Kindle settings could not be loaded. Reading and downloading are still available.</ErrorState>}
                    {actionError && <ErrorState>{actionError}</ErrorState>}
                    {/* Metadata last fetched */}
                    {book.metadataFetchedAt && (
                        <Text fontSize="xs" color="fg.muted">
                            Metadata last enriched {new Date(book.metadataFetchedAt).toLocaleDateString()}
                        </Text>
                    )}
                </Stack>
            </Flex>
            <PageSection title="About this book">
                {activeSummary?.trim() ? <Summary html={activeSummary}/> : <Text color="fg.muted">No summary is available yet.</Text>}
                {(activeIsbn || activePageCount || activePublisher || activeLanguage) && <SimpleGrid columns={{base: 2, md: 3}} gap={4}>
                    {activeIsbn && <MetaItem label="ISBN" value={activeIsbn}/>}
                    {activePageCount && <MetaItem label="Pages" value={String(activePageCount)}/>}
                    {activePublisher && <MetaItem label="Publisher" value={activePublisher}/>}
                    {activeLanguage && <MetaItem label="Language" value={activeLanguage.toUpperCase()}/>}
                </SimpleGrid>}
            </PageSection>
            <Box as="details" borderTopWidth="1px" pt={4}>
                <Box as="summary" cursor="pointer" fontFamily="heading" fontSize="xl" py={3}>Book tools and maintenance</Box>
                <Stack gap={4} pt={4}>
                    <Text color="fg.muted">Update this book's presentation, manage linked formats, or clear your saved reading position.</Text>
                    <Flex gap={3} wrap="wrap">
                        <Button variant="outline" minH="44px" onClick={() => void openCoverSearch()}><LuImagePlus/> Find a cover</Button>
                        <Button variant="outline" minH="44px" loading={generatingSummary} onClick={async () => {
                            setActionError("");
                            try {
                                const result = await generateSummary(book.id).unwrap();
                                if (!result.summary?.trim()) ToastFactory({message: "No summary could be found on Open Library for this book.", type: "info"});
                            } catch { setActionError("The summary could not be looked up. Please try again."); }
                        }}><LuLibrary/> Look up summary</Button>
                        <ConfirmAction title={`Refresh metadata for ${book.title}?`}
                            description="Look up book information again. Existing metadata may be replaced by the retrieved details."
                            actionLabel="Refresh metadata" disabled={fetchingMetadata}
                            onConfirm={async () => { await fetchMetadata(book.id).unwrap(); ToastFactory({message: "Metadata refreshed", type: "success"}); }}>
                            <LuRefreshCw/> Refresh metadata
                        </ConfirmAction>
                        <ManageBookFormatsButton book={book} canManage={canDelete}/>
                        {isCurrentlyReading && <ConfirmAction title={`Reset reading position for ${book.title}?`}
                            description="Remove your saved reading position on this device and in the cloud. The book stays in your library, but it will no longer appear in Continue reading."
                            actionLabel="Reset reading position" destructive onConfirm={() => removeCurrentlyReading(book.id)}/>}
                        {canDelete && <ConfirmAction title={`Delete ${book.title}?`}
                            description="Delete this book and its files from the library, not just from a shelf. This cannot be undone."
                            actionLabel="Delete book" destructive onConfirm={async () => {await deleteBook(book.id).unwrap(); navigate("/");}}/>}
                    </Flex>
                </Stack>
            </Box>

            <Dialog.Root open={coverSearchOpen} closeOnEscape={!selectingCover} closeOnInteractOutside={!selectingCover}
                onOpenChange={(event) => {if (!selectingCover) setCoverSearchOpen(event.open);}}>
                <Portal>
                    <Dialog.Backdrop/>
                    <Dialog.Positioner>
                        <Dialog.Content maxW="4xl" maxH="85vh">
                            <Dialog.Header>
                                <Dialog.Title>Find a book cover</Dialog.Title>
                            </Dialog.Header>
                            <Dialog.Body overflowY="auto">
                                <Stack gap={4}>
                                    <Text fontSize="sm" color="fg.muted">
                                        Search Open Library and select the image you want to use for this book.
                                    </Text>
                                    <form onSubmit={(event) => void submitCoverSearch(event)}>
                                        <Flex gap={2}>
                                            <Input
                                                aria-label="Search covers"
                                                value={coverSearchQuery}
                                                onChange={(event) => setCoverSearchQuery(event.target.value)}
                                                placeholder="Search by title or author"
                                            />
                                            <Button type="submit" minH="44px" disabled={selectingCover || !coverSearchQuery.trim()} loading={searchingCovers}>
                                                <LuSearch/> Search
                                            </Button>
                                        </Flex>
                                    </form>
                                    {coverError && <ErrorState>{coverError}</ErrorState>}
                                    {searchingCovers && coverCandidates.length === 0 ? (
                                        <Flex justify="center" py={10}><Spinner/></Flex>
                                    ) : coverCandidates.length > 0 ? (
                                        <SimpleGrid columns={{base: 2, sm: 3, md: 4}} gap={3}>
                                            {coverCandidates.map((candidate) => (
                                                <Button
                                                    key={candidate.coverId}
                                                    type="button"
                                                    variant="outline"
                                                    h="auto"
                                                    p={2}
                                                    whiteSpace="normal"
                                                    justifyContent="flex-start"
                                                    alignItems="stretch"
                                                    flexDirection="column"
                                                    onClick={() => void handleSelectCover(candidate)}
                                                    loading={selectingCover}
                                                    disabled={selectingCover}
                                                    _hover={{borderColor: "colorPalette.solid", bg: "bg.muted"}}
                                                >
                                                    <Image
                                                        src={candidate.thumbnailUrl}
                                                        alt={`Cover for ${candidate.title}`}
                                                        w="full"
                                                        aspectRatio="2/3"
                                                        objectFit="cover"
                                                        borderRadius="sm"
                                                        bg="bg.muted"
                                                        onError={(event) => {
                                                            event.currentTarget.style.visibility = "hidden";
                                                        }}
                                                    />
                                                    <Stack gap={0} w="full" align="flex-start" pt={1}>
                                                        <Text fontSize="xs" fontWeight="medium" lineClamp={2} textAlign="left">
                                                            {candidate.title}
                                                        </Text>
                                                        <Text fontSize="xs" color="fg.muted" lineClamp={1} textAlign="left">
                                                            {candidate.authors[0] ?? "Unknown author"}
                                                            {candidate.year ? ` · ${candidate.year}` : ""}
                                                        </Text>
                                                    </Stack>
                                                </Button>
                                            ))}
                                        </SimpleGrid>
                                    ) : !coverError && (
                                        <EmptyState title="No covers found">Try a different title or author.</EmptyState>
                                    )}
                                </Stack>
                            </Dialog.Body>
                            <Dialog.CloseTrigger asChild><CloseButton aria-label="Close cover search" minH="44px" minW="44px" disabled={selectingCover}/></Dialog.CloseTrigger>
                        </Dialog.Content>
                    </Dialog.Positioner>
                </Portal>
            </Dialog.Root>

        </Stack>
    );
}
