import {useMemo, useState} from "react";
import {Badge, Box, Button, CloseButton, Dialog, Flex, IconButton, Portal, Separator, Spinner, Stack, Text} from "@chakra-ui/react";
import {LuChevronRight, LuLink, LuUnlink} from "react-icons/lu";
import {Tooltip} from "@/shared/ui/tooltip";
import {
    type BookModel,
    useLinkBooksMutation,
    useSearchBooksQuery,
    useUnlinkBookFormatMutation,
} from "@/entities/book";
import {getAvailableBookFormats, getBookFormatLabel} from "@/entities/book/model/bookFormats";
import TextField from "@/shared/ui/TextField";
import {useDebounce} from "@uidotdev/usehooks";
import ToastFactory from "@/shared/lib/toast/toast";
import {handleRtkError} from "@/shared/api/rtk-query";

interface ManageBookFormatsButtonProps {
    book: BookModel;
    canManage: boolean;
}

export function ManageBookFormatsButton({book, canManage}: ManageBookFormatsButtonProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [linkQuery, setLinkQuery] = useState("");
    const [selectedLinkBookId, setSelectedLinkBookId] = useState<string | null>(null);
    const [unlinkingId, setUnlinkingId] = useState<string | null>(null);
    const debouncedLinkQuery = useDebounce(linkQuery, 250);

    const availableFormats = useMemo(() => getAvailableBookFormats(book), [book]);

    const {data: searchResults = [], isFetching: isSearching} = useSearchBooksQuery(debouncedLinkQuery, {
        skip: !isOpen || !canManage || debouncedLinkQuery.trim().length < 2,
    });

    const linkCandidates = useMemo(
        () => searchResults.filter((candidate) => candidate.id !== book.id),
        [book.id, searchResults],
    );
    const selectedCandidate = linkCandidates.find((c) => c.id === selectedLinkBookId) ?? null;

    const [linkBooks, {isLoading: linkingBooks}] = useLinkBooksMutation();
    const [unlinkFormat] = useUnlinkBookFormatMutation();

    const handleClose = () => {
        setIsOpen(false);
        setLinkQuery("");
        setSelectedLinkBookId(null);
    };

    const handleLink = async () => {
        if (!selectedLinkBookId) return;
        try {
            await linkBooks({targetBookId: book.id, sourceBookId: selectedLinkBookId}).unwrap();
            ToastFactory({message: "Books linked successfully", type: "success"});
            setLinkQuery("");
            setSelectedLinkBookId(null);
        } catch (error) {
            handleRtkError(error);
        }
    };

    const handleUnlink = async (formatId: string) => {
        setUnlinkingId(formatId);
        try {
            await unlinkFormat({bookId: book.id, formatId}).unwrap();
            ToastFactory({message: "Format unlinked", type: "success"});
        } catch (error) {
            handleRtkError(error);
        } finally {
            setUnlinkingId(null);
        }
    };

    const unlinkableFormats = availableFormats.filter(
        (f) => !f.id.endsWith("-legacy"),
    );
    const canUnlink = canManage && unlinkableFormats.length > 1;

    return (
        <>
            <Tooltip content="Manage format links">
                <IconButton variant="ghost" aria-label="Manage format links" onClick={() => setIsOpen(true)}>
                    <LuLink/>
                </IconButton>
            </Tooltip>

            <Dialog.Root open={isOpen} onOpenChange={(e) => !e.open && handleClose()}>
                <Portal>
                    <Dialog.Backdrop/>
                    <Dialog.Positioner>
                        <Dialog.Content>
                            <Dialog.Header>
                                <Dialog.Title>Format Links</Dialog.Title>
                            </Dialog.Header>

                            <Dialog.Body>
                                <Stack gap={5}>
                                    {/* Current linked formats */}
                                    <Box>
                                        <Text fontSize="xs" fontWeight="semibold" textTransform="uppercase" letterSpacing="wide" color="fg.subtle" mb={2}>
                                            Linked Formats
                                        </Text>
                                        <Stack gap={1}>
                                            {availableFormats.map((format) => {
                                                const isUnlinkable = canUnlink && !format.id.endsWith("-legacy");
                                                return (
                                                    <Flex key={format.id} align="center" justify="space-between" py={1}>
                                                        <Badge size="sm" variant="outline">
                                                            {getBookFormatLabel(format.format)}
                                                        </Badge>
                                                        {isUnlinkable && (
                                                            <Tooltip content={`Unlink ${getBookFormatLabel(format.format)}`}>
                                                                <IconButton
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    aria-label={`Unlink ${getBookFormatLabel(format.format)}`}
                                                                    color="fg.error"
                                                                    _hover={{bg: "red.subtle"}}
                                                                    loading={unlinkingId === format.id}
                                                                    onClick={() => handleUnlink(format.id)}
                                                                >
                                                                    <LuUnlink/>
                                                                </IconButton>
                                                            </Tooltip>
                                                        )}
                                                    </Flex>
                                                );
                                            })}
                                        </Stack>
                                    </Box>

                                    {canManage && (
                                        <>
                                            <Separator/>

                                            {/* Link a new book */}
                                            <Box>
                                                <Text fontSize="xs" fontWeight="semibold" textTransform="uppercase" letterSpacing="wide" color="fg.subtle" mb={1}>
                                                    Link another book
                                                </Text>
                                                <Text fontSize="sm" color="fg.muted" mb={3}>
                                                    Search for a separate book entry to merge its formats into this one.
                                                </Text>
                                                <Stack gap={3}>
                                                    <TextField
                                                        label="Search library"
                                                        placeholder="Type a title or author"
                                                        value={linkQuery}
                                                        onChange={(e) => {
                                                            setLinkQuery(e.currentTarget.value);
                                                            setSelectedLinkBookId(null);
                                                        }}
                                                    />
                                                    {debouncedLinkQuery.trim().length < 2 ? (
                                                        <Text fontSize="sm" color="fg.muted">Enter at least 2 characters to search.</Text>
                                                    ) : isSearching ? (
                                                        <Flex justify="center" py={2}>
                                                            <Spinner size="sm"/>
                                                        </Flex>
                                                    ) : linkCandidates.length === 0 ? (
                                                        <Text fontSize="sm" color="fg.muted">No matching books found.</Text>
                                                    ) : (
                                                        <Stack gap={1} maxH="240px" overflowY="auto">
                                                            {linkCandidates.map((candidate) => {
                                                                const candidateFormats = getAvailableBookFormats(candidate);
                                                                const isSelected = selectedLinkBookId === candidate.id;
                                                                return (
                                                                    <Flex
                                                                        key={candidate.id}
                                                                        as="button"
                                                                        align="center"
                                                                        justify="space-between"
                                                                        px={3}
                                                                        py={2}
                                                                        borderRadius="md"
                                                                        border="1px solid"
                                                                        borderColor={isSelected ? "blue.500" : "border"}
                                                                        bg={isSelected ? "blue.subtle" : "transparent"}
                                                                        cursor="pointer"
                                                                        onClick={() => setSelectedLinkBookId(candidate.id)}
                                                                        _hover={{bg: isSelected ? "blue.subtle" : "bg.subtle"}}
                                                                        textAlign="left"
                                                                        w="full"
                                                                    >
                                                                        <Box flex={1} minW={0}>
                                                                            <Text fontWeight="medium" truncate>{candidate.title}</Text>
                                                                            <Text fontSize="sm" color="fg.muted">{candidate.author}</Text>
                                                                        </Box>
                                                                        <Flex align="center" gap={2} flexShrink={0} ml={2}>
                                                                            <Text fontSize="xs" color="fg.subtle">
                                                                                {candidateFormats.map((f) => getBookFormatLabel(f.format)).join(" / ")}
                                                                            </Text>
                                                                            <LuChevronRight size={14} opacity={0.4}/>
                                                                        </Flex>
                                                                    </Flex>
                                                                );
                                                            })}
                                                        </Stack>
                                                    )}
                                                </Stack>
                                            </Box>
                                        </>
                                    )}
                                </Stack>
                            </Dialog.Body>

                            <Dialog.Footer>
                                <Button variant="ghost" onClick={handleClose}>
                                    {canManage ? "Cancel" : "Close"}
                                </Button>
                                {canManage && (
                                    <Button
                                        onClick={handleLink}
                                        disabled={!selectedCandidate}
                                        loading={linkingBooks}
                                    >
                                        <LuLink/> Link books
                                    </Button>
                                )}
                            </Dialog.Footer>

                            <Dialog.CloseTrigger asChild>
                                <CloseButton/>
                            </Dialog.CloseTrigger>
                        </Dialog.Content>
                    </Dialog.Positioner>
                </Portal>
            </Dialog.Root>
        </>
    );
}
