import type {Route} from "./+types/users";
import {UserManagementPage} from "@/pages/userManagement";
import {redirect} from "react-router";

export function clientLoader() {
    if (sessionStorage.getItem('user_role') !== 'ADMIN') {
        return redirect('/');
    }
    return null;
}

export function meta({}: Route.MetaArgs) {
    return [
        {title: "Homebranch - User Management"},
    ];
}

export default function Users() {
    return <UserManagementPage/>;
}
