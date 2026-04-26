import TextField from "@/shared/ui/TextField";
import {useAppDispatch, useAppSelector} from "@/app/hooks";
import React from "react";
import {updateQuery} from "@/features/library/store/librarySlice";

export function SearchLibrary() {
    const dispatch = useAppDispatch();
    const query = useAppSelector(state => state.library.query);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        dispatch(updateQuery(e.currentTarget.value));
    }

    return <TextField placeholder={"Search"} value={query} onChange={handleChange}/>
}
