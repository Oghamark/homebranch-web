import {AddBookShelfButton, useGetBookShelvesQuery} from "@/entities/bookShelf";
import {Button, Stack} from "@chakra-ui/react";
import {NavLink} from "react-router";
import {ErrorState} from "@/shared/ui/EditorialUI";

export function BookShelfNavigationSection({onNavigate}: {onNavigate?: () => void}) {
    const {data: shelves = [], isError, refetch} = useGetBookShelvesQuery();
    return <Stack gap={2}>
        {isError && <ErrorState onRetry={refetch}>Your shelves could not be loaded.</ErrorState>}
        <Stack as="nav" aria-label="Bookshelves" gap={1}>
            {shelves.map(shelf =>
                <Button key={shelf.id} asChild minW={0} justifyContent="start" variant="ghost" minH="44px" whiteSpace="normal" textAlign="start"
                    css={{'&[aria-current="page"]': {background: "var(--chakra-colors-bg-emphasized)", fontWeight: "bold"}}}>
                    <NavLink to={`/book-shelves/${shelf.id}`} onClick={onNavigate}>{shelf.title}</NavLink>
                </Button>
            )}
        </Stack>
        <AddBookShelfButton/>
    </Stack>;
}
