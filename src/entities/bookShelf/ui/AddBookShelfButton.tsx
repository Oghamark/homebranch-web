import {useState} from "react";
import {Button} from "@chakra-ui/react";
import {LuPlus} from "react-icons/lu";
import TextField from "@/components/ui/TextField";
import {toaster} from "@/components/ui/toaster";
import {useCreateBookShelfMutation} from "@/entities/bookShelf";
import {handleRtkError} from "@/shared/api/rtk-query";

export function AddBookShelfButton() {
    const [createBookShelf] = useCreateBookShelfMutation();
    const [isEditing, setIsEditing] = useState(false);
    const [bookShelfName, setBookShelfName] = useState("");

    const onSubmit = async () => {
        setIsEditing(false);
        if (bookShelfName && bookShelfName.length > 0) {
            try {
                await createBookShelf({title: bookShelfName}).unwrap();
                toaster.create({type: 'success', title: 'Successfully Added!', duration: 3000});
                setBookShelfName("");
            } catch (error) {
                handleRtkError(error);
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
        <Button variant={"outline"} size={"sm"} width="100%" onClick={() => setIsEditing(true)}><LuPlus/> Add Book Shelf</Button>
    )
}