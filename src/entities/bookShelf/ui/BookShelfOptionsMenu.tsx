import {useMatch, useNavigate} from "react-router";
import {useDeleteBookShelfMutation} from "@/entities/bookShelf";
import {ConfirmAction} from "@/shared/ui/EditorialUI";
import {Text} from "@chakra-ui/react";
import {LuTrash2} from "react-icons/lu";

interface BookShelfOptionsMenuProps {
    bookShelfId: string;
    bookShelfTitle: string;
}

export function BookShelfOptionsMenu({bookShelfId, bookShelfTitle}: BookShelfOptionsMenuProps) {
    const isBookShelfMatch = useMatch(`/book-shelves/${bookShelfId}`);
    const navigate = useNavigate();
    const [deleteBookShelf] = useDeleteBookShelfMutation();
    return <ConfirmAction title={`Delete shelf ${bookShelfTitle}?`}
        description="Remove this shelf and its book memberships. The books and their files will stay in your library."
        actionLabel="Delete shelf" destructive onConfirm={async () => {
            await deleteBookShelf(bookShelfId).unwrap();
            if (isBookShelfMatch) navigate("/");
        }}><LuTrash2 aria-hidden="true"/><Text as="span">Delete shelf</Text><Text as="span" srOnly>{bookShelfTitle}</Text></ConfirmAction>;
}
