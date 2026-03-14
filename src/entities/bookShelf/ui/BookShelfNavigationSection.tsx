import {useState} from "react";
import {AddBookShelfButton, BookShelfOptionsMenu, useGetBookShelvesQuery} from "@/entities/bookShelf";
import {Flex, For, Tabs} from "@chakra-ui/react";
import {Link} from "react-router";

interface BookShelfNavigationSectionProps {
    onNavigate?: () => void;
}

export function BookShelfNavigationSection({onNavigate}: BookShelfNavigationSectionProps) {
    const {data: bookShelves = []} = useGetBookShelvesQuery();

    return (
        <>
            {bookShelves.length > 0 && <Tabs.Root
                orientation={"vertical"}
                variant={"subtle"}
                value={location.pathname}
            >
                <Tabs.List width={"100%"} mb={2}>
                    <For each={bookShelves}>
                        {(bookShelf) => (
                            <BookShelfTab id={bookShelf.id} title={bookShelf.title} onNavigate={onNavigate}/>
                        )}
                    </For>
                </Tabs.List>
            </Tabs.Root>}
            <AddBookShelfButton/>
        </>

    )
}

function BookShelfTab({id, title, onNavigate}: { id: string, title: string, onNavigate?: () => void }) {
    const [hovered, setHovered] = useState(false);

    return (
        <Tabs.Trigger
            value={`/book-shelves/${id}`}
            asChild
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            <Flex justify={"space-between"} align={"center"}>
                <Link to={`/book-shelves/${id}`} style={{flex: 1}} onClick={onNavigate}>{title}</Link>
                {hovered && (
                    <BookShelfOptionsMenu bookShelfId={id} bookShelfTitle={title}/>
                )}
            </Flex>
        </Tabs.Trigger>
    )
}