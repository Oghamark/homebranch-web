import {Button} from "@chakra-ui/react";
import {Link} from "react-router";
import {EmptyState} from "@/shared/ui/EditorialUI";
import {useCollectionSearch} from "@/features/library";
import type {ReactNode} from "react";

export function CollectionEmpty({title, children, libraryLink = false}: {title: string; children?: ReactNode; libraryLink?: boolean}) {
    const {query, setQuery} = useCollectionSearch();
    if (query) return <EmptyState title="No matches in this collection"
        action={<Button variant="outline" minH="44px" onClick={() => setQuery("")}>Clear search</Button>}>
        Try a different title, author, or keyword search.
    </EmptyState>;
    return <EmptyState title={title} action={libraryLink ? <Button asChild minH="44px"><Link to="/">Browse library</Link></Button> : undefined}>
        {children}
    </EmptyState>;
}
