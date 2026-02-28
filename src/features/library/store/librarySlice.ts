import {createSlice, type PayloadAction} from "@reduxjs/toolkit";

export interface LibraryState {
    query: string;
    showAllUsers: boolean;
}

const initialState: LibraryState = {
    query: '',
    showAllUsers: false,
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
    }
});

export const {updateQuery, toggleShowAllUsers} = librarySlice.actions;

export default librarySlice.reducer;