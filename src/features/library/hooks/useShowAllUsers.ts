import {useAppSelector} from "@/app/hooks";
import {config} from "@/shared/config";

export function useShowAllUsers() {
    const showAllUsers = useAppSelector(state => state.library.showAllUsers);
    // Tenants in cloud mode only ever see their own library.
    if (config.cloudMode && sessionStorage.getItem('user_role') !== 'ADMIN') return false;
    return showAllUsers;
}
