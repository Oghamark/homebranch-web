import {IconButton} from "@chakra-ui/react";
import {HiX} from "react-icons/hi";
import {useRemoveBookFromBookShelfMutation} from "@/entities/bookShelf";
import {useState} from "react";
import {Box, Text} from "@chakra-ui/react";

interface RemoveBookFromShelfButtonProps {
    shelfId: string;
    bookId: string;
}

export function RemoveBookFromShelfButton({shelfId, bookId}: RemoveBookFromShelfButtonProps) {
    const [removeBook, {isLoading}] = useRemoveBookFromBookShelfMutation();
    const [failed, setFailed] = useState(false);

    return (
        <Box position="absolute" top={1} right={1}>
        <IconButton
            aria-label="Remove book from shelf"
            title="Remove from shelf, not from library"
            minH="44px"
            minW="44px"
            variant="solid"
            colorPalette="red"
            loading={isLoading}
            onClick={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                setFailed(false);
                try {await removeBook({shelfId, bookId}).unwrap();}
                catch {setFailed(true);}
            }}
        >
            <HiX/>
        </IconButton>
        {failed && <Text role="alert" bg="bg.panel" color="fg.error" p={2} fontSize="xs">Could not remove. Try again.</Text>}
        </Box>
    );
}
