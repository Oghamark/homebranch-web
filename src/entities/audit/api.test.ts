import {configureStore} from "@reduxjs/toolkit";
import {AxiosError, AxiosHeaders} from "axios";
import {beforeEach, describe, expect, it, vi} from "vitest";

const requests = vi.hoisted(() => ({baseQuery: vi.fn(), authGet: vi.fn()}));
vi.mock("@/shared/api", () => ({authAxiosInstance: {get: requests.authGet}}));
vi.mock("@/shared/api/rtk-query", async () => {
    const {createApi} = await import("@reduxjs/toolkit/query/react");
    return {
        homebranchApi: createApi({
            reducerPath: "auditTest", baseQuery: requests.baseQuery, endpoints: () => ({}),
        }),
    };
});

import {auditApi} from "./api";

const filters = {limit: 25, offset: 0, actor: "reader", action: "DELETE", outcome: "failure" as const};
const page = {data: [], total: 0, limit: 25, offset: 0};

function makeStore() {
    return configureStore({
        reducer: {[auditApi.reducerPath]: auditApi.reducer},
        middleware: getDefaultMiddleware => getDefaultMiddleware().concat(auditApi.middleware),
    });
}

beforeEach(() => {
    vi.clearAllMocks();
    requests.baseQuery.mockResolvedValue({data: page});
    requests.authGet.mockResolvedValue({data: page});
});

describe("audit log sources", () => {
    it("queries the appropriate service with the same server-side filters", async () => {
        const store = makeStore();
        const application = store.dispatch(auditApi.endpoints.getAuditLogs.initiate(filters));
        const authentication = store.dispatch(auditApi.endpoints.getAuthenticationAuditLogs.initiate(filters));
        expect(await application.unwrap()).toEqual(page);
        expect(await authentication.unwrap()).toEqual(page);
        expect(requests.baseQuery).toHaveBeenCalledWith({url: "/audit-logs", params: filters}, expect.anything(), undefined);
        expect(requests.authGet).toHaveBeenCalledWith("/audit-logs", {params: filters});
        application.unsubscribe();
        authentication.unsubscribe();
        store.dispatch(auditApi.util.resetApiState());
    });

    it("propagates authentication service authorization and network errors instead of empty logs", async () => {
        const store = makeStore();
        const denied = new AxiosError("Denied");
        denied.response = {status: 403, data: {message: "Denied"}, statusText: "Forbidden", headers: {}, config: {headers: new AxiosHeaders()}};
        requests.authGet.mockRejectedValueOnce(denied);
        const response = store.dispatch(auditApi.endpoints.getAuthenticationAuditLogs.initiate(filters));
        await expect(response.unwrap()).rejects.toEqual({status: 403, data: {message: "Denied"}});
        requests.authGet.mockRejectedValueOnce(new Error("Network unavailable"));
        const retry = store.dispatch(auditApi.endpoints.getAuthenticationAuditLogs.initiate({...filters, offset: 25}));
        await expect(retry.unwrap()).rejects.toEqual({status: "FETCH_ERROR", error: "Authentication audit logs could not be loaded"});
        response.unsubscribe();
        retry.unsubscribe();
        store.dispatch(auditApi.util.resetApiState());
    });
});
