import {useState} from "react";
import {AddBookShelfButton, useDeleteBookShelfMutation, useGetBookShelvesQuery} from "@/entities/bookShelf";
import {Flex, For, IconButton, Loader, Tabs} from "@chakra-ui/react";
import {Link, useMatch, useNavigate} from "react-router";
import {HiTrash} from "react-icons/hi";
import ToastFactory from "@/app/utils/toast_handler";

export function BookShelfNavigationSection() {
    const {data: bookShelves = []} = useGetBookShelvesQuery();

    return (
        <>
            {bookShelves.length > 0 && <Tabs.Root
                orientation={"vertical"}
                variant={"subtle"}
                value={location.pathname}
            >
                <Tabs.List width={"100%"} style={{marginBottom: 10}}>
                    <For each={bookShelves}>
                        {(bookShelf) => (
                            <BookShelfTab id={bookShelf.id} title={bookShelf.title}/>
                        )}
                    </For>
                </Tabs.List>
            </Tabs.Root>}
            <AddBookShelfButton/>
        </>

    )
}

function BookShelfTab({id, title}: { id: string, title: string }) {
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
        <Tabs.Trigger value={`/book-shelves/${id}`} asChild padding={0}>
            <Flex justify={"space-between"} onMouseEnter={() => setHovered(true)}
                  onMouseLeave={() => setHovered(false)}>
                <Link to={`/book-shelves/${id}`} style={{flex: 1, marginLeft: 20}}>{title}</Link>
                {hovered && (
                    <IconButton
                        variant={"subtle"}
                        aria-label={`Delete ${title}`}
                        onClick={handleDeleteBookShelf}
                        disabled={isDeletingBookShelf}
                        style={{borderRadius: "0 var(--tabs-trigger-radius) var(--tabs-trigger-radius) 0"}}
                    >
                        {isDeletingBookShelf ? <Loader/> : <HiTrash size={1}/>}
                    </IconButton>
                )}
            </Flex>
        </Tabs.Trigger>

    )
}