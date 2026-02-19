import type {Route} from "./+types/users";
import {UserManagementPage} from "@/pages/userManagement/ui/UserManagementPage";

export function meta({}: Route.MetaArgs) {
    return [
        {title: "Homebranch - User Management"},
    ];
}

export default function Users() {
    return <UserManagementPage/>;
}