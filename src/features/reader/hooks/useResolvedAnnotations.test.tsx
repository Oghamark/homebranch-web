import {act, renderHook, waitFor} from "@testing-library/react";
import {describe, expect, it, vi} from "vitest";
import type {EpubNavigator} from "@readium/navigator";
import type {Annotation} from "@/features/koreader/api";
import {useResolvedAnnotations} from "./useResolvedAnnotations";
const item: Annotation = {id: "a", bookId: "book", quote: "Native quote", note: "A note", color: "yellow", anchor: {version: 1, exact: "Native quote", native: {pos0: "/native/one", pos1: "/native/two"}}, deleted: false, revision: "1", updatedAt: ""};
function navigator(resources: Record<string, string>, fail = false) {
    const read = vi.fn(async (href: string) => {
        if (fail) throw new Error("offline");
        return resources[href];
    });
    const close = vi.fn();
    return {ref: {current: {publication: {baseURL: "http://localhost/epub/", readingOrder: {items: Object.keys(resources).map(href => ({href}))},
        get: (link: {href: string}) => ({readAsString: () => read(link.href), close})}} as unknown as EpubNavigator}, read, close, recover: () => { fail = false; }};
}
describe("native quote resource discovery", () => {
    it("checks all chapters before assigning an exact unique portable resource", async () => {
        const nav = navigator({"one.xhtml": "<p>Other text</p>", "Text/two%20words.xhtml": "<p>Native <em>quote</em></p>"});
        const {result} = renderHook(() => useResolvedAnnotations([item], nav.ref, true, "book"));
        expect(result.current.items[0].anchor.href).toBeUndefined();
        await waitFor(() => expect(result.current.items[0].anchor.href).toBe("Text/two%20words.xhtml"));
        expect(result.current.items[0].anchor.native).toEqual(item.anchor.native);
        expect(nav.read).toHaveBeenCalledTimes(2);
        expect(nav.close).toHaveBeenCalledTimes(2);
    });
    it("rejects repeated quotes across chapters and within a single chapter", async () => {
        const nav = navigator({"one.xhtml": "<p>Native quote Native quote</p>", "two.xhtml": "<p>Native quote</p>"});
        const {result} = renderHook(() => useResolvedAnnotations([item], nav.ref, true, "book"));
        await waitFor(() => expect(result.current.searching).toBe(false));
        expect(result.current.items[0].anchor.href).toBeUndefined();
        expect(result.current.unresolved.a).toContain("repeated quote");
    });
    it("reports failed verification, retains unresolved content and retries", async () => {
        const nav = navigator({"one.xhtml": "<p>Native quote</p>"}, true);
        const {result} = renderHook(() => useResolvedAnnotations([item], nav.ref, true, "book"));
        await waitFor(() => expect(result.current.error).toContain("Unable to verify"));
        expect(result.current.items[0].anchor.href).toBeUndefined();
        nav.recover();
        act(() => result.current.retry());
        await waitFor(() => expect(result.current.items[0].anchor.href).toBe("one.xhtml"));
        expect(result.current.error).toBe("");
    });
    it("uses context only to disambiguate repeated literal quotes across resources", async () => {
        const nav = navigator({"one.xhtml": "<p>First Native quote end.</p>", "two.xhtml": "<p>Second Native quote finish.</p>"});
        const contextual = {...item, anchor: {...item.anchor, prefix: "Second ", suffix: " finish."}};
        const {result} = renderHook(() => useResolvedAnnotations([contextual], nav.ref, true, "book"));
        await waitFor(() => expect(result.current.items[0].anchor.href).toBe("two.xhtml"));
    });
});
