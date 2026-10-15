import {describe, expect, it, vi} from "vitest";
import {jobsApi} from "./api";

vi.mock("@/shared/api/rtk-query", () => ({
    homebranchApi: {injectEndpoints: (options: {endpoints: (builder: unknown) => unknown}) => ({
        definitions: options.endpoints({query: (definition: unknown) => definition, mutation: (definition: unknown) => definition}),
    })},
}));

type Response = {data?: unknown; error?: {status: number | string; data?: unknown}};
const query = (jobsApi as unknown as {definitions: {getLibrarySetting: {
    queryFn: (key: string, api: unknown, options: unknown, baseQuery: () => Promise<Response>) => Promise<Response>;
}}}).definitions.getLibrarySetting.queryFn;

describe("optional library default owner setting", () => {
    it("treats only a missing setting as an unset default", async () => {
        const baseQuery = vi.fn().mockResolvedValue({error: {status: 404, data: "Setting not found"}});
        expect(await query("default_scan_user_id", {}, {}, baseQuery)).toEqual({data: null});
        expect(baseQuery).toHaveBeenCalledWith({url: "/settings/default_scan_user_id"});
    });

    it.each([401, 403, 500, "FETCH_ERROR"])("preserves a %s failure for visible error and retry", async status => {
        const error = {status, data: "Request failed"};
        expect(await query("default_scan_user_id", {}, {}, vi.fn().mockResolvedValue({error}))).toEqual({error});
    });

    it("returns the saved setting unchanged", async () => {
        const data = {key: "default_scan_user_id", value: "owner"};
        expect(await query("default_scan_user_id", {}, {}, vi.fn().mockResolvedValue({data}))).toEqual({data});
    });
});
