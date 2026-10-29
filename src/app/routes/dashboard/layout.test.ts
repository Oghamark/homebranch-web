import {beforeEach, describe, expect, it, vi} from "vitest";

const mocks = vi.hoisted(() => ({dispatch: vi.fn(), access: vi.fn()}));
vi.mock("@/app/store", () => ({store: {dispatch: mocks.dispatch}}));
vi.mock("@/shared/api/rtk-query", () => ({
    homebranchApi: {util: {resetApiState: () => ({type: "homebranch/reset"})}},
    authenticationApi: {util: {resetApiState: () => ({type: "authentication/reset"})}},
}));
vi.mock("@/features/authentication/api/cloudAccess", () => ({checkCloudAccess: mocks.access}));
vi.mock("@/components/navigation/NavigationCard", () => ({NavigationCard: () => null}));
vi.mock("@/components/navigation/MobileNavigation", () => ({MobileNavigation: () => null}));
vi.mock("@/shared/hooks", () => ({useLibraryEvents: () => undefined}));
vi.mock("@/entities/book", () => ({DragDropOverlay: () => null}));

beforeEach(() => {
    vi.resetModules(); vi.clearAllMocks(); sessionStorage.clear();
    mocks.access.mockResolvedValue(null);
});

describe("account-scoped social cache boundary", () => {
    it("clears API and display-name data on account changes but not ordinary navigation", async () => {
        const {clientLoader} = await import("./layout");
        sessionStorage.setItem("user_id", "reader-one");
        await clientLoader();
        expect(mocks.dispatch.mock.calls.map(([action]) => action)).toEqual([
            {type: "homebranch/reset"}, {type: "authentication/reset"},
        ]);
        await clientLoader();
        expect(mocks.dispatch).toHaveBeenCalledTimes(2);
        sessionStorage.setItem("user_id", "reader-two");
        await clientLoader();
        expect(mocks.dispatch).toHaveBeenCalledTimes(4);
    });

    it("clears old account data before redirecting an unauthenticated visitor", async () => {
        const {clientLoader} = await import("./layout");
        sessionStorage.setItem("user_id", "reader-one");
        await clientLoader();
        sessionStorage.removeItem("user_id");
        const result = await clientLoader();
        expect(mocks.dispatch).toHaveBeenCalledTimes(4);
        expect(result).toBeInstanceOf(Response);
        expect((result as Response).headers.get("Location")).toBe("/login");
        expect(mocks.access).toHaveBeenCalledTimes(1);
    });
});
