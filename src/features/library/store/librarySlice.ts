import {createSlice, type PayloadAction} from "@reduxjs/toolkit";

export interface LibraryState {
    query: string;
    showAllUsers: boolean;
    displayMode: LibraryDisplayMode;
    booksPerRow: number;
}

export type LibraryDisplayMode = "grid" | "table";

const initialState: LibraryState = {
    query: '',
    showAllUsers: false,
    displayMode: "grid",
    booksPerRow: 4,
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
        setBooksPerRow: (state, action: PayloadAction<number>) => {
            state.booksPerRow = Math.max(2, Math.min(action.payload, 8));
        },
    }
});

export const {updateQuery, toggleShowAllUsers, setDisplayMode, setBooksPerRow} = librarySlice.actions;

export default librarySlice.reducer;