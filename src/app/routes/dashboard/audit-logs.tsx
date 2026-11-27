import {redirect} from "react-router";
import {AuditLogsPage} from "@/pages/auditLogs/AuditLogsPage";

export function clientLoader() {
    if (sessionStorage.getItem("user_role") !== "ADMIN") return redirect("/");
    return null;
}

export function meta() {
    return [{title: "Homebranch - Audit Logs"}];
}

export default function AuditLogs() {
    return <AuditLogsPage/>;
}
