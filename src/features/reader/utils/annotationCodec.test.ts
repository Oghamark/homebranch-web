import {afterEach, describe, expect, it, vi} from "vitest";
import {captureAnnotationSelection, annotationMatches, frameResourceHref, renderAnnotationRanges, resolveAnnotationRange, resourceHref} from "./annotationCodec";
import type {AnnotationAnchor} from "@/features/koreader/api";

const base = `${window.location.origin}/epub/`;
const anchor = (exact: string, extra: Partial<AnnotationAnchor> = {}): AnnotationAnchor => ({version: 1, exact, ...extra});
afterEach(() => { window.getSelection()?.removeAllRanges(); document.body.innerHTML = ""; document.querySelectorAll("base[data-readium]").forEach(base => base.remove()); vi.restoreAllMocks(); });

describe("conservative annotation range codec", () => {
    it("round-trips real multi-node selections and preserves exact context", () => {
        window.history.replaceState(null, "", "/epub/Text/chapter%20one.xhtml");
        document.body.innerHTML = "<p>Before <em>multi</em> node <b>quote</b> after.</p>";
        const range = document.createRange();
        range.setStart(document.querySelector("em")!.firstChild!, 0);
        range.setEnd(document.querySelector("b")!.firstChild!, 5);
        window.getSelection()!.addRange(range);
        const result = captureAnnotationSelection(window, base);
        expect(result).toEqual({version: 1, href: "Text/chapter%20one.xhtml", exact: "multi node quote", prefix: "Before ", suffix: " after."});
        expect(resolveAnnotationRange(document, result!)?.toString()).toBe("multi node quote");
    });
    it("captures element-boundary selections without progress serialization", () => {
        window.history.replaceState(null, "", "/epub/one.xhtml");
        document.body.innerHTML = "<p>start <b>selected <i>text</i></b> end</p>";
        const range = document.createRange();
        range.selectNodeContents(document.querySelector("b")!);
        window.getSelection()!.addRange(range);
        expect(captureAnnotationSelection(window, base)?.exact).toBe("selected text");
    });
    it("rejects repeated quotes unless exact context identifies exactly one", () => {
        document.body.innerHTML = "<p>First quote finish. Second quote end.</p>";
        expect(resolveAnnotationRange(document, anchor("quote"))).toBeNull();
        expect(resolveAnnotationRange(document, anchor("quote", {prefix: "Second ", suffix: " end."}))?.toString()).toBe("quote");
        expect(resolveAnnotationRange(document, anchor("quote", {prefix: "Wrong "}))).toBeNull();
        expect(annotationMatches(document, anchor("quote"))).toHaveLength(2);
    });
    it("does not fuzzy match or collapse whitespace or use unsupported native pointers", () => {
        document.body.innerHTML = "<p>A  quoted\ntext.</p>";
        expect(resolveAnnotationRange(document, anchor("quoted text"))).toBeNull();
        expect(resolveAnnotationRange(document, anchor("A quoted"))).toBeNull();
        expect(resolveAnnotationRange(document, anchor("", {native: {pos0: "/body/p.1", pos1: "/body/p.2"}}))).toBeNull();
    });
    it("accepts a globally unique literal quote despite engine-specific block context", () => {
        document.body.innerHTML = "<p>Before</p><p>Unique quote</p><p>After</p>";
        expect(resolveAnnotationRange(document, anchor("Unique quote", {prefix: "Before\n", suffix: "\nAfter"}))?.toString()).toBe("Unique quote");
    });
    it("does not include script/style/hidden text in quote matching", () => {
        document.body.innerHTML = "<p>safe <b>quote</b></p><script>safe quote</script><span hidden>safe quote</span>";
        expect(resolveAnnotationRange(document, anchor("safe quote"))?.toString()).toBe("safe quote");
    });
    it("preserves encoded identity, chapter paths and origins, without basename fallback", () => {
        expect(resourceHref(`${base}Text/chapter%20one.xhtml#x`, base)).toBe("Text/chapter%20one.xhtml");
        expect(resourceHref("Text/chapter one.xhtml", base)).toBe("Text/chapter%20one.xhtml");
        expect(resourceHref("Text/percent%2520.xhtml", base)).toBe("Text/percent%2520.xhtml");
        expect(resourceHref(resourceHref("Text/percent%2520.xhtml", base)!, base)).toBe("Text/percent%2520.xhtml");
        expect(resourceHref("Text/a%2Fb.xhtml", base)).not.toBe(resourceHref("Text/a/b.xhtml", base));
        expect(resourceHref("https://different.invalid/epub/a.xhtml", base)).toBeNull();
        expect(resourceHref("../outside.xhtml", base)).toBeNull();
        expect(resourceHref("bad%xx.xhtml", base)).toBeNull();
    });
    it("resolves real Readium blob frames only through their injected original-resource base", () => {
        const frame = {document, location: {protocol: "blob:", href: `blob:${window.location.origin}/opaque-id`}, getSelection: () => window.getSelection()} as unknown as Window;
        expect(frameResourceHref(frame, base)).toBeNull();
        const injected = document.createElement("base");
        injected.dataset.readium = "true";
        injected.href = `${base}Text/chapter%20one.xhtml`;
        document.head.prepend(injected);
        expect(frameResourceHref(frame, base)).toBe("Text/chapter%20one.xhtml");
        document.body.innerHTML = "<p>Actual <em>selected</em> quote</p>";
        const range = document.createRange();
        range.selectNodeContents(document.querySelector("p")!);
        window.getSelection()!.addRange(range);
        expect(captureAnnotationSelection(frame, base)?.href).toBe("Text/chapter%20one.xhtml");
        injected.href = "https://untrusted.invalid/chapter.xhtml";
        expect(frameResourceHref(frame, base)).toBeNull();
    });
    it("uses guarded CSS Highlight API without modifying publication text and cleans up", () => {
        document.body.innerHTML = "<p>safe quote</p>";
        const original = document.body.innerHTML;
        const highlights = {set: vi.fn(), delete: vi.fn()};
        vi.stubGlobal("CSS", {highlights});
        vi.stubGlobal("Highlight", class { constructor(..._ranges: Range[]) {} });
        const cleanup = renderAnnotationRanges(window, [{id: "a", color: "yellow", range: resolveAnnotationRange(document, anchor("safe quote"))!}]);
        expect(highlights.set).toHaveBeenCalledTimes(7);
        expect(document.body.innerHTML).toBe(original);
        cleanup!();
        expect(highlights.delete).toHaveBeenCalledTimes(7);
        expect(document.querySelector("[data-homebranch-annotations]")).toBeNull();
        vi.unstubAllGlobals();
        expect(renderAnnotationRanges(window, [])).toBeNull();
    });
});
