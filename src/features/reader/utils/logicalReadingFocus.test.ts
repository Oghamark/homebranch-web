import {afterEach, describe, expect, it, vi} from "vitest";
import {Locator, LocatorLocations, LocatorText} from "@readium/shared";
import type {LocationMap} from "../types/PortableLocation";
import {LogicalReadingFocus} from "./logicalReadingFocus";
import {canonicalText, capturePortableLocation, firstVisibleOffset, textLocator} from "./portableLocation";

afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); document.body.replaceChildren(); });

function fixture() {
    const container = document.createElement("div");
    const frame = document.createElement("iframe");
    frame.className = "readium-navigator-iframe";
    frame.src = "http://localhost/epub/one.xhtml";
    container.append(frame); document.body.append(container);
    const wnd = frame.contentWindow!, doc = wnd.document;
    doc.open(); doc.write("<body><h1 id='first'>Opening</h1><p>Brief opening.</p><h2 id='second'>Other&nbsp;section</h2><p>A uniquely identified selected passage.</p></body>"); doc.close();
    const index = canonicalText(doc);
    const second = index.text.indexOf("Other");
    const map: LocationMap = {version: 1, formatId: "format", contentHash: "content", fingerprint: "map",
        resources: [{href: "one.xhtml", start: 0, end: index.text.length}],
        chapters: [{id: "one.xhtml#first", title: "Opening", href: "one.xhtml", fragment: "first", kind: "chapter", start: 0, end: second},
            {id: "one.xhtml#second", title: "Other", href: "one.xhtml", fragment: "second", kind: "chapter", start: second, end: index.text.length}]};
    vi.spyOn(frame, "getBoundingClientRect").mockReturnValue({width: 390, height: 640} as DOMRect);
    let visible = true;
    const originalRange = doc.createRange.bind(doc);
    vi.spyOn(doc, "createRange").mockImplementation(() => {
        const range = originalRange();
        range.getClientRects = () => [{left: visible ? 10 : 2000, right: visible ? 20 : 2010,
            top: 10, bottom: 30, width: 10, height: 20}] as unknown as DOMRectList;
        return range;
    });
    const position = new Locator({href: frame.src, type: "application/xhtml+xml"});
    return {container, wnd, index, map, second, position, visibility: (value: boolean) => { visible = value; }};
}

describe("verified logical reading focus", () => {
    it("keeps a visibly selected quote's section even when preceding text shares its page", async () => {
        const f = fixture(), focus = new LogicalReadingFocus();
        const locator = textLocator(f.position, f.index, f.second)!;
        expect(await focus.select(locator, f.container, f.map, "http://localhost/epub/")).toBe(true);
        expect(firstVisibleOffset(f.wnd, f.index)).toBe(0);
        const offset = focus.capture(f.wnd, f.index, f.map, "one.xhtml")!;
        expect(capturePortableLocation(f.map, "one.xhtml", offset)?.chapterId).toBe("one.xhtml#second");
        expect(focus.capture(f.wnd, f.index, f.map, "other/one.xhtml")).toBeNull();
    });
    it("retains a supported fragment/selector focus through temporary repagination, then clears on reading movement", async () => {
        const f = fixture(), focus = new LogicalReadingFocus();
        const locator = new Locator({href: f.position.href, type: f.position.type,
            locations: new LocatorLocations({fragments: ["second"]})});
        expect(await focus.select(locator, f.container, f.map, "http://localhost/epub/")).toBe(true);
        f.visibility(false);
        expect(focus.capture(f.wnd, f.index, f.map, "one.xhtml")).toBeNull();
        expect(focus.locator).toBe(locator);
        f.visibility(true);
        expect(focus.capture(f.wnd, f.index, f.map, "one.xhtml")).toBe(f.second);
        focus.clear();
        expect(focus.capture(f.wnd, f.index, f.map, "one.xhtml")).toBeNull();
        expect(firstVisibleOffset(f.wnd, f.index)).toBe(0);
    });
    it("fails an invisible target rather than treating a renderer ACK as proof", async () => {
        vi.useFakeTimers();
        const f = fixture(), focus = new LogicalReadingFocus();
        const locator = textLocator(f.position, f.index, f.second)!;
        f.visibility(false);
        const pending = focus.select(locator, f.container, f.map, "http://localhost/epub/");
        await vi.advanceTimersByTimeAsync(650);
        expect(await pending).toBe(false);
        expect(focus.locator).toBeNull();
    });
    it("reapplies supported navigation after repagination but still requires visibility", async () => {
        vi.useFakeTimers();
        const f = fixture(), focus = new LogicalReadingFocus();
        const locator = textLocator(f.position, f.index, f.second)!;
        f.visibility(false);
        const reapply = vi.fn(async () => { f.visibility(true); return true; });
        const pending = focus.select(locator, f.container, f.map, "http://localhost/epub/", reapply);
        await vi.advanceTimersByTimeAsync(250);
        expect(await pending).toBe(true);
        expect(reapply).toHaveBeenCalledOnce();
        expect(focus.capture(f.wnd, f.index, f.map, "one.xhtml")).toBe(f.second);
    });
    it("does not revive a pending focus after intentional reading movement", async () => {
        vi.useFakeTimers();
        const f = fixture(), focus = new LogicalReadingFocus();
        const locator = textLocator(f.position, f.index, f.second)!;
        f.visibility(false);
        const reapply = vi.fn(async () => true);
        const pending = focus.select(locator, f.container, f.map, "http://localhost/epub/", reapply);
        focus.clear();
        f.visibility(true);
        await vi.advanceTimersByTimeAsync(650);
        expect(await pending).toBe(false);
        expect(reapply).not.toHaveBeenCalled();
        expect(focus.locator).toBeNull();
    });
    it("resolves Readium-normalized whitespace without losing the exact DOM point", async () => {
        const f = fixture(), focus = new LogicalReadingFocus();
        const locator = new Locator({href: f.position.href, type: f.position.type,
            text: new LocatorText({highlight: "section", before: "Other "}),
            locations: new LocatorLocations({otherLocations: new Map([["cssSelector", "#second"]])})});
        expect(await focus.select(locator, f.container, f.map, "http://localhost/epub/")).toBe(true);
        const offset = focus.capture(f.wnd, f.index, f.map, "one.xhtml")!;
        expect(f.index.text.slice(offset)).toMatch(/^section/);
        expect(capturePortableLocation(f.map, "one.xhtml", offset)?.chapterId).toBe("one.xhtml#second");
    });
});
