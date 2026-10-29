import {Button, Field, Flex, Input, Text} from "@chakra-ui/react";
import {useCollectionSearch} from "../hooks/useLibrarySearch";

export function SearchLibrary({label = "Search this collection"}: {label?: string}) {
    const {query, setQuery} = useCollectionSearch();
    return <Field.Root flex="1" minW={{base: "100%", sm: "240px"}}>
        <Field.Label>{label}</Field.Label>
        <Flex gap={2} width="100%">
            <Input type="search" minH="44px" value={query} placeholder="Title, author, or keyword"
                onChange={event => setQuery(event.currentTarget.value)}/>
            {query && <Button variant="outline" minH="44px" onClick={() => setQuery("")}>Clear search</Button>}
        </Flex>
    </Field.Root>;
}
