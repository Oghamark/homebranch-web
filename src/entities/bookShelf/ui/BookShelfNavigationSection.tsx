import {useState} from "react";
import {AddBookShelfButton, useGetBookShelvesQuery} from "@/entities/bookShelf";
import {Flex, For, IconButton, Tabs} from "@chakra-ui/react";
import {Link} from "react-router";
import {HiTrash} from "react-icons/hi";

export function BookShelfNavigationSection() {
    const {data: bookShelves = []} = useGetBookShelvesQuery();

    return (
        <>
            <Tabs.Root
                orientation={"vertical"}
                variant={"subtle"}
                value={location.pathname}
            >
                <Tabs.List width={"100%"}>
                    <For each={bookShelves}>
                        {(bookShelf) => (
                                <BookShelfTab id={bookShelf.id} title={bookShelf.title}/>
                        )}
                    </For>
                </Tabs.List>
            </Tabs.Root>
            <AddBookShelfButton />
        </>

    )
}

function BookShelfTab({id, title}: {id: string, title: string}) {
    const [hovered, setHovered] = useState(false);

    return (
        <Flex justify={"space-between"} onMouseEnter={()=>setHovered(true)} onMouseLeave={()=>setHovered(false)}>
            <Tabs.Trigger value={`/book-shelves/${id}`} asChild>
                <Link to={`/book-shelves/${id}`}>{title}</Link>
            </Tabs.Trigger>
            {hovered && (
                <IconButton
                    variant={"subtle"}
                    size={"sm"}
                    aria-label={`Delete ${title}`}
                >
                    <HiTrash />
                </IconButton>
            )}
        </Flex>
    )
}