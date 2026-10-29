import type React from "react";
import {type BookModel} from "@/entities/book";
import {
    Avatar,
    Box,
    Button,
    Card,
    Flex,
    Image,
    Link,
    Skeleton,
    Stack,
    Text
} from "@chakra-ui/react";
import {useState} from "react";
import ReactMarkdown from "react-markdown";
import {BookGridSkeletons, LibraryPage} from "@/pages/library";
import {PageHeader} from "@/shared/ui/EditorialUI";
import type {LibraryDisplayMode} from "@/features/library/store/librarySlice";

interface AuthorPageProps {
    authorName: string;
    biography?: string | null;
    profilePictureUrl?: string | null;
    isAuthorLoading?: boolean;
    books: BookModel[];
    hasMore: boolean;
    totalBooks?: number;
    fetchMore: () => void;
    noResultsNode?: React.ReactNode;
    toolbar?: React.ReactNode;
    displayMode?: LibraryDisplayMode;
    loadingMore?: boolean;
    loadMoreError?: boolean;
}

const BIOGRAPHY_CHAR_LIMIT = 400;

function Biography({text}: { text: string }) {
    const [expanded, setExpanded] = useState(false);
    const isLong = text.length > BIOGRAPHY_CHAR_LIMIT;

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
            >
                <ReactMarkdown
                    components={{
                        p: ({children}) => <Text as="p">{children}</Text>,
                        a: ({href, children}) => (
                            <Link href={href} color="colorPalette.500" target="_blank" rel="noopener noreferrer">
                                {children}
                            </Link>
                        ),
                    }}
                >
                    {text}
                </ReactMarkdown>
            </Box>
            {isLong && (
                <Button variant="plain" minH="44px" color="fg.muted" px={0} mt={1} aria-expanded={expanded}
                        onClick={() => setExpanded(e => !e)}>
                    {expanded ? "Show less" : "Read more"}
                </Button>
            )}
        </Box>
    );
}

function AuthorHero({authorName, biography, profilePictureUrl}: {
    authorName: string;
    biography?: string | null;
    profilePictureUrl?: string | null;
}) {
    const [failedUrl, setFailedUrl] = useState<string | null>(null);
    return (
        <Card.Root variant="subtle" overflow="hidden">
            <Card.Body p={0}>
                <Stack
                    direction={{base: "column", md: "row"}}
                    gap={0}
                    align="stretch"
                >
                    <Box
                        flexShrink={0}
                        width={{base: "100%", md: "200px"}}
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        bg="bg.subtle"
                        p={6}
                    >
                        {profilePictureUrl && failedUrl !== profilePictureUrl ? (
                            <Image
                                src={profilePictureUrl}
                                alt={authorName}
                                borderRadius="lg"
                                objectFit="cover"
                                maxH="220px"
                                width="auto"
                                shadow="md"
                                onError={() => setFailedUrl(profilePictureUrl)}
                            />
                        ) : (
                            <Avatar.Root size="2xl" width="140px" height="140px">
                                <Avatar.Fallback name={authorName} css={{fontSize: "3rem"}}/>
                            </Avatar.Root>
                        )}
                    </Box>

                    <Stack gap={3} p={6} flex={1} justify="center" minW={0}>
                        <PageHeader title={authorName}/>
                        {biography && <Biography text={biography}/>}
                    </Stack>
                </Stack>
            </Card.Body>
        </Card.Root>
    );
}

function AuthorHeroSkeleton() {
    return (
        <Card.Root variant="subtle" overflow="hidden">
            <Card.Body p={0}>
                <Stack
                    direction={{base: "column", md: "row"}}
                    gap={0}
                    align="stretch"
                >
                    <Box
                        flexShrink={0}
                        width={{base: "100%", md: "200px"}}
                        minH={{base: "200px", md: "auto"}}
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        bg="bg.subtle"
                        p={6}
                    >
                        <Skeleton width="140px" height="180px" borderRadius="lg"/>
                    </Box>
                    <Stack gap={3} p={6} flex={1} justify="center">
                        <Skeleton height="2rem" width="250px"/>
                        <Stack gap={1}>
                            <Skeleton height="0.875rem" width="100%"/>
                            <Skeleton height="0.875rem" width="95%"/>
                            <Skeleton height="0.875rem" width="80%"/>
                            <Skeleton height="0.875rem" width="60%"/>
                        </Stack>
                    </Stack>
                </Stack>
            </Card.Body>
        </Card.Root>
    );
}

export function AuthorPage({authorName, biography, profilePictureUrl, isAuthorLoading, books, hasMore, totalBooks, fetchMore, noResultsNode, toolbar, displayMode, loadingMore, loadMoreError}: AuthorPageProps) {
    return (
        <Stack gap={6} height="100%">
            {isAuthorLoading
                ? <AuthorHeroSkeleton/>
                : <AuthorHero authorName={authorName} biography={biography} profilePictureUrl={profilePictureUrl}/>
            }
            {toolbar}
            {noResultsNode
                ? <Flex flex={1} alignItems="center" justifyContent="center">{noResultsNode}</Flex>
                : (
                <LibraryPage books={books} fetchMore={fetchMore} hasMore={hasMore} totalBooks={totalBooks}
                    displayMode={displayMode} loadingMore={loadingMore} loadMoreError={loadMoreError}/>
            )}
        </Stack>
    );
}

export function AuthorPageSkeleton({booksOnly = false}: {booksOnly?: boolean} = {}) {
    return (
        <Stack gap={6}>
            {!booksOnly && <AuthorHeroSkeleton/>}
            <BookGridSkeletons/>
        </Stack>
    );
}
