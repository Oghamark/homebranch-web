import TextField from "@/components/ui/TextField";
import {useAppDispatch} from "@/app/hooks";
import React from "react";
import {updateQuery} from "@/features/library/store/librarySlice";

const SEARCH_PLACEHOLDER = 'Search — or use isbn:, genre:, series:, author: keywords';

export function SearchLibrary() {
    const dispatch = useAppDispatch();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        dispatch(updateQuery(e.currentTarget.value));
    }

    return <TextField placeholder={SEARCH_PLACEHOLDER} onChange={handleChange}/>
}