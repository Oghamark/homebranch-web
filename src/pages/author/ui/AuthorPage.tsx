import {BookCard, BookCardSkeleton, type BookModel} from "@/entities/book";
import {Avatar, Box, Button, Card, For, Grid, Heading, Image, Link, Skeleton, Stack, Text} from "@chakra-ui/react";
import InfiniteScroll from "react-infinite-scroll-component";
import {useState} from "react";
import ReactMarkdown from "react-markdown";

interface AuthorPageProps {
    authorName: string;
    biography?: string | null;
    profilePictureUrl?: string | null;
    isAuthorLoading?: boolean;
    books: BookModel[];
    hasMore: boolean;
    totalBooks?: number;
    fetchMore: () => void;
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
                <Button variant="plain" size="xs" color="fg.subtle" px={0} mt={1}
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
    return (
        <Card.Root variant="subtle" overflow="hidden">
            <Card.Body p={0}>
                <Stack
                    direction={{base: "column", md: "row"}}
                    gap={0}
                    align="stretch"
                >
                    {/* Author image — large, prominent */}
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
                        {profilePictureUrl ? (
                            <Image
                                src={profilePictureUrl}
                                alt={authorName}
                                borderRadius="lg"
                                objectFit="cover"
                                maxH="220px"
                                width="auto"
                                shadow="md"
                            />
                        ) : (
                            <Avatar.Root size="2xl" width="140px" height="140px">
                                <Avatar.Fallback name={authorName} css={{fontSize: "3rem"}}/>
                            </Avatar.Root>
                        )}
                    </Box>

                    {/* Author info */}
                    <Stack gap={3} p={6} flex={1} justify="center" minW={0}>
                        <Heading size="2xl">{authorName}</Heading>
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

function BookGridSkeletons({count = 12}: { count?: number } = {}) {
    return (
        <Grid gridTemplateColumns="repeat(auto-fill, minmax(160px, 1fr))" gap={6} p={1}>
            {Array.from({length: count}).map((_, index) => (
                <BookCardSkeleton key={index}/>
            ))}
        </Grid>
    );
}

export function AuthorPage({authorName, biography, profilePictureUrl, isAuthorLoading, books, hasMore, totalBooks, fetchMore}: AuthorPageProps) {
    const remaining = totalBooks != null ? Math.max(totalBooks - books.length, 0) : 12;

    return (
        <Stack gap={6}>
            {isAuthorLoading
                ? <AuthorHeroSkeleton/>
                : <AuthorHero authorName={authorName} biography={biography} profilePictureUrl={profilePictureUrl}/>
            }
            <InfiniteScroll
                next={fetchMore}
                hasMore={hasMore && books.length > 0}
                loader={<BookGridSkeletons count={remaining}/>}
                dataLength={books.length}
            >
                <Grid gridTemplateColumns="repeat(auto-fill, minmax(160px, 1fr))" gap={6} p={1} pb={3}>
                    <For each={books}>
                        {(book, _index) => (
                            <BookCard book={book}/>
                        )}
                    </For>
                </Grid>
            </InfiniteScroll>
        </Stack>
    );
}

export function AuthorPageSkeleton() {
    return (
        <Stack gap={6}>
            <AuthorHeroSkeleton/>
            <BookGridSkeletons/>
        </Stack>
    );
}
