import {useState} from "react";
import {Button} from "@chakra-ui/react";
import {HiPlus} from "react-icons/hi";
import TextField from "@/components/ui/TextField";
import {toaster} from "@/components/ui/toaster";
import {type BookShelfModel, createBookShelf} from "@/entities/bookShelf";

interface AddBookShelfButtonProps {
    onBookShelfAdded?: (bookShelf: BookShelfModel) => void;
}

export function AddBookShelfButton({onBookShelfAdded}: AddBookShelfButtonProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [bookShelfName, setBookShelfName] = useState("");

    const onSubmit = async () => {
        setIsEditing(false);
        if (bookShelfName && bookShelfName.length > 0) {
            const loadingToaster = toaster.create({type: "loading", title: "Creating Book Shelf"});
            try {
                const result = await createBookShelf({title: bookShelfName});
                if (result?.success && result.value) {
                    toaster.create({type: 'success', title: 'Successfully Added!', duration:3000});
                    if (onBookShelfAdded) {
                        onBookShelfAdded(result.value);
                    }
                    setBookShelfName("");
                } else {
                    toaster.create({type: 'error', title: 'Failed to create Book Shelf', duration: 3000});
                }
            } catch (error) {
                toaster.create({type: 'error', title: 'Failed to create Book Shelf', duration: 3000});
            } finally {
                toaster.dismiss(loadingToaster);
            }
        }
    }

    if (isEditing) {
        return (
            <TextField
                label={''}
                placeholder={"Enter Book Shelf Name"}
                autoFocus={true}
                onBlur={onSubmit}
                value={bookShelfName}
                onChange={(event) => setBookShelfName(event.target.value)}
                onKeyDown={(event) => {
                    if (event.key === "Enter") {
                        onSubmit();
                    }
                }}
            />
        )
    }

    return (
        <Button variant={"outline"} size={"sm"} onClick={() => setIsEditing(true)}><HiPlus/> Add Book Shelf</Button>
    )
}