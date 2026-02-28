import {Avatar, Box, Skeleton, Stack, Text} from "@chakra-ui/react";
import type {AuthorModel} from "@/entities/author";
import {useGetAuthorQuery} from "@/entities/author";
import {Link} from "react-router";

export function AuthorCard({author}: { author: AuthorModel }) {
    const {data: enriched, isLoading} = useGetAuthorQuery(author.name);

    const profilePictureUrl = enriched?.profilePictureUrl ?? author.profilePictureUrl;

    return (
        <Link to={`/authors/${encodeURIComponent(author.name)}`} style={{textDecoration: "none"}}>
            <Stack
                align="center"
                gap={3}
                p={4}
                borderRadius="xl"
                transition="background 0.2s"
                _hover={{bg: "bg.subtle"}}
                cursor="pointer"
            >
                {isLoading ? (
                    <Skeleton width="120px" height="120px" borderRadius="full" flexShrink={0}/>
                ) : (
                    <Avatar.Root
                        width="120px"
                        height="120px"
                        flexShrink={0}
                    >
                        <Avatar.Fallback name={author.name} css={{fontSize: "2.5rem"}}/>
                        {profilePictureUrl &&
                            <Avatar.Image src={profilePictureUrl} alt={author.name}/>}
                    </Avatar.Root>
                )}
                <Box textAlign="center" overflow="hidden" width="100%">
                    <Text fontWeight="semibold" lineClamp={2}>{author.name}</Text>
                    <Text color="fg.muted" fontSize="sm">
                        {author.bookCount} {author.bookCount === 1 ? "book" : "books"}
                    </Text>
                </Box>
            </Stack>
        </Link>
    );
}

export function AuthorCardSkeleton() {
    return (
        <Stack align="center" gap={3} p={4}>
            <Skeleton width="120px" height="120px" borderRadius="full"/>
            <Stack align="center" gap={1}>
                <Skeleton height="1.25em" width="100px"/>
                <Skeleton height="0.875em" width="60px"/>
            </Stack>
        </Stack>
    );
}
