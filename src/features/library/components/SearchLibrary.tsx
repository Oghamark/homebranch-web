import TextField from "@/components/ui/TextField";
import {useAppDispatch} from "@/app/hooks";
import React from "react";
import {updateQuery} from "@/features/library/store/librarySlice";

export function SearchLibrary() {
    const dispatch = useAppDispatch();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        dispatch(updateQuery(e.currentTarget.value));
    }

    return <TextField placeholder={"Search"} onChange={handleChange}/>
}