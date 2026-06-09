import {useAppSelector} from "@/app/hooks";

export function useLibraryDisplayMode() {
    return useAppSelector(state => state.library.displayMode);
}
