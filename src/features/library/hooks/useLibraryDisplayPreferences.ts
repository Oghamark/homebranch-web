import {useAppSelector} from "@/app/hooks";

export function useLibraryDisplayMode() {
    return useAppSelector(state => state.library.displayMode);
}

export function useLibraryBooksPerRow() {
    return useAppSelector(state => state.library.booksPerRow);
}
