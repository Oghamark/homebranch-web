import {createSlice, type PayloadAction} from "@reduxjs/toolkit";

export interface LibraryState {
    query: string;
}

const initialState: LibraryState = {
    query: '',
}

const librarySlice = createSlice({
    name: 'library',
    initialState: initialState,
    reducers: {
        updateQuery: (state, action: PayloadAction<string>) => {
            state.query = action.payload;
        }
    }
});

export const {updateQuery} = librarySlice.actions;

export default librarySlice.reducer;