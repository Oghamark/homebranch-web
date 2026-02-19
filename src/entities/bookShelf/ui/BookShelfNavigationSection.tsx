import {useState} from "react";
import {AddBookShelfButton, useDeleteBookShelfMutation, useGetBookShelvesQuery} from "@/entities/bookShelf";
import {Flex, For, IconButton, Loader, Menu, Portal, Tabs} from "@chakra-ui/react";
import {Link, useMatch, useNavigate} from "react-router";
import {LuEllipsis, LuTrash2} from "react-icons/lu";
import ToastFactory from "@/app/utils/toast_handler";

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
    const isBookShelfMatch = useMatch(`/book-shelves/${id}`);
    const navigate = useNavigate();
    const [hovered, setHovered] = useState(false);

    const [deleteBookShelf, {isLoading: isDeletingBookShelf}] = useDeleteBookShelfMutation()

    const handleDeleteBookShelf = () => {
        deleteBookShelf(id).then(() => {
            ToastFactory({message: "Successfully Deleted!", type: "success"});
            if (isBookShelfMatch) {
                navigate("/");
            }
        }).catch(() => {
            ToastFactory({message: "Delete Failed!", type: "error"});
        })
    }

    return (
        <Tabs.Trigger
            value={`/book-shelves/${id}`}
            asChild
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            <Flex justify={"space-between"} align={"center"}>
                <Link to={`/book-shelves/${id}`} style={{flex: 1}} onClick={onNavigate}>{title}</Link>
                {(hovered || isDeletingBookShelf) && (
                    <Menu.Root>
                        <Menu.Trigger asChild>
                            <IconButton
                                variant={"ghost"}
                                size={"2xs"}
                                aria-label={`Options for ${title}`}
                                onClick={(e) => e.stopPropagation()}
                            >
                                {isDeletingBookShelf ? <Loader/> : <LuEllipsis size={14}/>}
                            </IconButton>
                        </Menu.Trigger>
                        <Portal>
                            <Menu.Positioner>
                                <Menu.Content>
                                    <Menu.Item
                                        value="delete"
                                        color="fg.error"
                                        onClick={handleDeleteBookShelf}
                                        disabled={isDeletingBookShelf}
                                    >
                                        <LuTrash2 size={14}/>
                                        Delete
                                    </Menu.Item>
                                </Menu.Content>
                            </Menu.Positioner>
                        </Portal>
                    </Menu.Root>
                )}
            </Flex>
        </Tabs.Trigger>
    )
}