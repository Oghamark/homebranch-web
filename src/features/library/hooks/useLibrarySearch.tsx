import {useAppSelector} from "@/app/hooks";
import {useDebounce} from "@uidotdev/usehooks";

export function useLibrarySearch() {
    const {query} = useAppSelector(state => state.library)
    return useDebounce(query, 500)
}