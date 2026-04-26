import {IconButton, Loader, Menu, Portal} from "@chakra-ui/react";
import {LuEllipsis, LuTrash2} from "react-icons/lu";
import {useMatch, useNavigate} from "react-router";
import {useDeleteBookShelfMutation} from "@/entities/bookShelf";
import ToastFactory from "@/shared/lib/toast/toast";

interface BookShelfOptionsMenuProps {
    bookShelfId: string;
    bookShelfTitle: string;
}

export function BookShelfOptionsMenu({bookShelfId, bookShelfTitle}: BookShelfOptionsMenuProps) {
    const isBookShelfMatch = useMatch(`/book-shelves/${bookShelfId}`);
    const navigate = useNavigate();
    const [deleteBookShelf, {isLoading: isDeletingBookShelf}] = useDeleteBookShelfMutation();

    const handleDeleteBookShelf = () => {
        deleteBookShelf(bookShelfId).then(() => {
            ToastFactory({message: "Successfully Deleted!", type: "success"});
            if (isBookShelfMatch) {
                navigate("/");
            }
        }).catch(() => {
            ToastFactory({message: "Delete Failed!", type: "error"});
        });
    };

    return (
        <Menu.Root>
            <Menu.Trigger asChild>
                <IconButton
                    variant={"ghost"}
                    size={"2xs"}
                    aria-label={`Options for ${bookShelfTitle}`}
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
    );
}
