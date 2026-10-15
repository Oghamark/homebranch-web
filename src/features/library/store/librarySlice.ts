import {createSlice, type PayloadAction} from "@reduxjs/toolkit";

export interface LibraryState {
    showAllUsers: boolean;
    displayMode: LibraryDisplayMode;
}

export type LibraryDisplayMode = "grid" | "table";

const initialState: LibraryState = {
    showAllUsers: false,
    displayMode: "grid",
}

const librarySlice = createSlice({
    name: 'library',
    initialState: initialState,
    reducers: {
        toggleShowAllUsers: (state) => {
            state.showAllUsers = !state.showAllUsers;
        },
        setDisplayMode: (state, action: PayloadAction<LibraryDisplayMode>) => {
            state.displayMode = action.payload;
        },
    }
});

export const {toggleShowAllUsers, setDisplayMode} = librarySlice.actions;

export default librarySlice.reducer;