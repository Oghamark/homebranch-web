import {useAppSelector} from "@/app/hooks";

export function useShowAllUsers() {
    return useAppSelector(state => state.library.showAllUsers);
}
