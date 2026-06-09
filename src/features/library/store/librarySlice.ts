import {createSlice, type PayloadAction} from "@reduxjs/toolkit";

export interface LibraryState {
    query: string;
    showAllUsers: boolean;
    displayMode: LibraryDisplayMode;
}

export type LibraryDisplayMode = "grid" | "table";

const initialState: LibraryState = {
    query: '',
    showAllUsers: false,
    displayMode: "grid",
}

const librarySlice = createSlice({
    name: 'library',
    initialState: initialState,
    reducers: {
        updateQuery: (state, action: PayloadAction<string>) => {
            state.query = action.payload;
        },
        toggleShowAllUsers: (state) => {
            state.showAllUsers = !state.showAllUsers;
        },
        setDisplayMode: (state, action: PayloadAction<LibraryDisplayMode>) => {
            state.displayMode = action.payload;
        },
    }
});

export const {updateQuery, toggleShowAllUsers, setDisplayMode} = librarySlice.actions;

export default librarySlice.reducer;