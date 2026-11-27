import {isAxiosError} from "axios";
import {authAxiosInstance} from "@/shared/api";
import {homebranchApi} from "@/shared/api/rtk-query";

export interface AuditLogEntry {
    id: string;
    createdAt: string;
    actorId: string | null;
    actorLabel: string | null;
    method: string;
    route: string;
    resourceIds: Record<string, string>;
    statusCode: number;
    outcome: "success" | "failure";
}

export interface AuditLogPage {
    data: AuditLogEntry[];
    total: number;
    limit: number;
    offset: number;
}

export interface AuditLogQuery {
    limit: number;
    offset: number;
    actor?: string;
    action?: string;
    outcome?: "success" | "failure";
    from?: string;
    to?: string;
}

export const auditApi = homebranchApi.injectEndpoints({
    endpoints: build => ({
        getAuditLogs: build.query<AuditLogPage, AuditLogQuery>({
            query: params => ({url: "/audit-logs", params}),
        }),
        getAuthenticationAuditLogs: build.query<AuditLogPage, AuditLogQuery>({
            queryFn: async params => {
                try {
                    const response = await authAxiosInstance.get<AuditLogPage>("/audit-logs", {params});
                    return {data: response.data};
                } catch (error: unknown) {
                    if (isAxiosError(error) && error.response) {
                        return {error: {status: error.response.status, data: error.response.data}};
                    }
                    return {error: {status: "FETCH_ERROR", error: "Authentication audit logs could not be loaded"}};
                }
            },
        }),
    }),
});

export const {useGetAuditLogsQuery, useGetAuthenticationAuditLogsQuery} = auditApi;
