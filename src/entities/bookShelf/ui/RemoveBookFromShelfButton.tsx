import {IconButton} from "@chakra-ui/react";
import {HiX} from "react-icons/hi";
import {useRemoveBookFromBookShelfMutation} from "@/entities/bookShelf";

interface RemoveBookFromShelfButtonProps {
    shelfId: string;
    bookId: string;
}

export function RemoveBookFromShelfButton({shelfId, bookId}: RemoveBookFromShelfButtonProps) {
    const [removeBook] = useRemoveBookFromBookShelfMutation();

    return (
        <IconButton
            size="xs"
            variant="solid"
            colorPalette="red"
            position="absolute"
            top={1}
            right={1}
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                removeBook({shelfId, bookId});
            }}
        >
            <HiX/>
        </IconButton>
    );
}
