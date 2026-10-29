import {useState, type ReactNode} from "react";
import {Box, Image, Skeleton, Stack, Text} from "@chakra-ui/react";
import type {BookModel} from "@/entities/book";
import {Link} from "react-router";
import {config} from "@/shared";
import {BookJacket} from "@/shared/ui/EditorialUI";

export function BookCard({book, badge}: { book: BookModel; badge?: ReactNode }) {
    const [failedCover, setFailedCover] = useState<string | null>(null);
    const cover = book.coverImageFileName;
    return (
        <Stack
            gap={3}
            minW={0}
        >
            <Link to={`/books/${book.id}`} aria-label={`View ${book.title}`} style={{display: "block"}}>
                <Box position="relative">
                    {cover && failedCover !== cover ? <Image
                        src={`${config.apiUrl}/uploads/cover-images/${cover}`}
                        aspectRatio="2/3"
                        objectFit="cover"
                        borderRadius="md"
                        width="100%"
                        alt=""
                        loading="lazy"
                        onError={() => setFailedCover(cover)}
                    /> : <Box aspectRatio="2/3" borderRadius="md" overflow="hidden"
                        css={{"& > div": {width: "100%", height: "100%", padding: "16px"}}}>
                        <BookJacket title={book.title} author={book.author}/>
                    </Box>}
                    {badge}
                </Box>
            </Link>
            <Box>
                <Link to={`/books/${book.id}`} style={{display: "flex", alignItems: "center", minHeight: "44px"}}>
                    <Text fontWeight="medium" lineClamp={2}>{book.title}</Text>
                </Link>
                <Text color="fg.muted" fontSize="sm" truncate>
                    {book.author}
                </Text>
            </Box>
        </Stack>
    );
}

export function BookCardSkeleton() {
    return (
        <Stack>
            <Skeleton aspectRatio="2/3" borderRadius="md"/>
            <Box>
                <Skeleton height="1em" width="80%"/>
                <Skeleton height="0.875em" width="60%" mt={1}/>
            </Box>
        </Stack>
    );
}
