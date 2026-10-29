import {useRef, useState} from "react";
import {Button, HStack, Stack} from "@chakra-ui/react";
import {LuPlus} from "react-icons/lu";
import TextField from "@/shared/ui/TextField";
import {useCreateBookShelfMutation} from "@/entities/bookShelf";
import {ErrorState} from "@/shared/ui/EditorialUI";

export function AddBookShelfButton() {
    const [createBookShelf, {isLoading}] = useCreateBookShelfMutation();
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState("");
    const [failed, setFailed] = useState(false);
    const pending = useRef(false);

    if (!isEditing) return <Button variant="outline" minH="44px" width="100%" onClick={() => setIsEditing(true)}><LuPlus/> Add shelf</Button>;

    return <form onSubmit={async (event) => {
        event.preventDefault();
        if (!name.trim() || pending.current) return;
        pending.current = true;
        setFailed(false);
        try {
            await createBookShelf({title: name.trim()}).unwrap();
            setName("");
            setIsEditing(false);
        } catch {
            setFailed(true);
        } finally {
            pending.current = false;
        }
    }}><Stack gap={2}>
        <TextField label="Shelf name" autoFocus value={name} disabled={isLoading} onChange={(event) => setName(event.target.value)}/>
        {failed && <ErrorState>The shelf could not be created. Your name has been kept.</ErrorState>}
        <HStack wrap="wrap">
            <Button minH="44px" type="submit" loading={isLoading} disabled={!name.trim()}>Create shelf</Button>
            <Button minH="44px" variant="ghost" disabled={isLoading} onClick={() => {setIsEditing(false); setFailed(false);}}>Cancel</Button>
        </HStack>
    </Stack></form>;
}
