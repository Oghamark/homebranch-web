import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {describe, expect, it} from "vitest";
import {Locator, LocatorLocations} from "@readium/shared";
import type {LocationMap, PortableLocation} from "../types/PortableLocation";
import {canonicalHref, canonicalText, capturePortableLocation, chapterAt, compatibleLocation, passageLocator, passageOffset, preciseLocatorMatches, preciseLocatorOffset, precisePublicationMatches, resolvePortableTarget, textLocator, uniqueAnchorOffset, verifiedResource, withPublicationIdentity} from "./portableLocation";
import {deserializeLocatorFromCloud, serializeLocatorForCloud} from "./locatorUtils";

const root = resolve("scripts/fixtures/chapter-locations");
const map = JSON.parse(readFileSync(resolve(root, "map.json"), "utf8")) as LocationMap;
function index(href: string) {
    return canonicalText(new DOMParser().parseFromString(readFileSync(resolve(root, href), "utf8"), "text/html"));
}
function location(chapterId = "OPS/one.xhtml#long", chapterProgression = 0.5): PortableLocation {
    return {version: 1, formatId: map.formatId, contentHash: map.contentHash, mapFingerprint: map.fingerprint,
        href: "OPS/one.xhtml", resourceProgression: 0.1, chapterId, chapterProgression, basis: "rendered"};
}
describe("portable EPUB coordinates using the original shared fixture", () => {
    it("captures bounded excerpts only with advertised support and restores the passage rather than its percentage", () => {
        const href = "OPS/one.xhtml", text = index(href);
        const currentMap: LocationMap = {...map, capabilities: {passageAnchor: 1}};
        const captured = capturePortableLocation(currentMap, href, 200, text)!;
        expect(captured.passage?.exact.length).toBeLessThanOrEqual(256);
        expect(capturePortableLocation(map, href, 200, text)?.passage).toBeUndefined();
        const chapter = map.chapters.find(ch => ch.id === captured.chapterId)!;
        const at = passageOffset(text.text, captured.passage!, chapter.start, Math.min(chapter.end, text.text.length));
        expect(at).toBe(200);
        const locator = passageLocator(new Locator({href, type: "application/xhtml+xml"}), text, at!)!;
        expect(preciseLocatorOffset(text.points.find(Boolean)!.node.ownerDocument, locator, text)).toBe(200);
    });
    it("rejects ambiguous, missing, oversized or out-of-section passages but uses context to distinguish repeats", () => {
        const exact = "the same passage";
        const text = `before ${exact} after. other ${exact} ending`;
        expect(passageOffset(text, {version: 1, exact})).toBeNull();
        expect(passageOffset(text, {version: 1, exact, prefix: "other"})).toBe(text.lastIndexOf(exact));
        expect(passageOffset(text, {version: 1, exact: "missing passage"})).toBeNull();
        expect(passageOffset(text, {version: 1, exact}, 0, 7)).toBeNull();
        expect(passageOffset("x".repeat(65_537), {version: 1, exact})).toBeNull();
    });
    it("builds verified text locators for passages beginning in short inline elements", () => {
        const doc = new DOMParser().parseFromString("<body><p>The old road.</p><p><b>The</b> orchard gate opens.</p></body>", "text/html");
        const text = canonicalText(doc), at = text.text.indexOf("The orchard");
        const target = passageLocator(new Locator({href: "one.xhtml", type: "application/xhtml+xml"}), text, at)!;
        expect(target).not.toBeNull();
        expect(preciseLocatorOffset(doc, target, text)).toBe(at);
    });
    it("keeps Unicode excerpts and contexts within contract bounds without splitting surrogate pairs", () => {
        const doc = new DOMParser().parseFromString(`<body><p>${"😀".repeat(200)}</p></body>`, "text/html");
        const text = canonicalText(doc);
        const unicodeMap: LocationMap = {...map, capabilities: {passageAnchor: 1}, chapters: [],
            resources: [{href: "unicode.xhtml", start: 0, end: text.text.length}]};
        const anchor = capturePortableLocation(unicodeMap, "unicode.xhtml", 101, text)!.passage!;
        for (const [value, limit] of [[anchor.exact, 256], [anchor.prefix!, 64], [anchor.suffix!, 64]] as const) {
            expect(value.length).toBeLessThanOrEqual(limit);
            expect(value).toBe("😀".repeat(value.length / 2));
        }
        const varied = canonicalText(new DOMParser().parseFromString(`<body><p>${"x".repeat(95)}😀suffix text here</p></body>`, "text/html"));
        const variedMap = {...unicodeMap, resources: [{href: "unicode.xhtml", start: 0, end: varied.text.length}]};
        const clipped = capturePortableLocation(variedMap, "unicode.xhtml", 0, varied)!.passage!;
        expect(clipped.exact).toBe("x".repeat(95));
        expect(clipped.suffix).toBe("😀suffix text here");
    });
    it("matches exact API canonical UTF16 text and unique anchors including external context", () => {
        for (const resource of map.resources) expect(verifiedResource(map, resource, index(resource.href))).toBe(true);
        const doc = new DOMParser().parseFromString("<body><p>A😀<b>B</b></p><p>C</p><p hidden>hidden</p><script>no</script><div style='display:none'>no</div></body>", "text/html");
        expect(canonicalText(doc).text).toBe("A😀B C");
    });
    it("identifies fragment sections from an actual canonical DOM point, not renderer percentage", () => {
        expect(capturePortableLocation(map, "OPS/one.xhtml", 40)?.chapterId).toBe("OPS/one.xhtml#opening");
        expect(capturePortableLocation(map, "OPS/one.xhtml", 200)?.chapterId).toBe("OPS/one.xhtml#long");
        expect(capturePortableLocation(map, "OPS/continued chapter.xhtml", 80)?.chapterId).toBe("OPS/one.xhtml#long");
        expect(capturePortableLocation(map, "OPS/continued chapter.xhtml", 400)?.chapterId).toBe("OPS/continued chapter.xhtml#closing");
    });
    it("weights unequal sections and follows one chapter across resources", () => {
        expect(resolvePortableTarget(map, location())?.offset).toBe(684);
        const target = resolvePortableTarget(map, location("OPS/one.xhtml#long", 0.95));
        expect(target?.href).toBe("OPS/continued chapter.xhtml");
        expect(target?.offset).toBe(222);
        expect(target?.label).toContain("Long chapter");
    });
    it("clamps all chapter endpoints inside their intended half-open section, including separators", () => {
        for (const chapter of map.chapters) for (const progress of [0, 0.5, 1]) {
            const input = {...location(chapter.id, progress), href: chapter.href};
            const target = resolvePortableTarget(map, input)!;
            const resource = map.resources.find(r => r.href === target.href)!;
            expect(chapterAt(map, resource.start + target.offset)?.id).toBe(chapter.id);
        }
        expect(chapterAt(map, 1679)?.id).toBe("OPS/last.xhtml#last");
    });
    it("rejects stale maps, wrong editions, nonexistent paths, invalid fractions and chapter/resource mismatch", () => {
        expect(compatibleLocation(map, {...location(), mapFingerprint: "old"})).toBe(false);
        for (const change of [{formatId: "other"}, {href: "one.xhtml"}, {chapterProgression: NaN}, {chapterProgression: 1.1}, {chapterId: "title"}, {href: "OPS/last.xhtml"}]) {
            expect(resolvePortableTarget(map, {...location(), ...change})).toBeNull();
        }
        expect(canonicalHref("https://evil.invalid/OPS/one.xhtml", "https://reader.invalid/epub/")).toBeNull();
        expect(canonicalHref("OPS/continued%20chapter.xhtml", "https://reader.invalid/epub/")).toBe("OPS/continued chapter.xhtml");
    });
    it("provides an explicitly labeled resource fallback without inventing a chapter", () => {
        const {chapterId: _, chapterProgression: __, ...resourceOnly} = location();
        const target = resolvePortableTarget(map, resourceOnly);
        expect(target?.quality).toBe("resource");
        expect(target?.label).toContain("Resource fallback");
        const noToc: LocationMap = {...map, chapters: map.resources.map(r => ({...r, id: r.href, title: r.href, kind: "resource"}))};
        const captured = capturePortableLocation(noToc, "OPS/one.xhtml", 40)!;
        expect(resolvePortableTarget(noToc, captured)?.quality).toBe("resource");
    });
    it("retains supported same-engine quote anchors separately and rejects ambiguous quote evidence", () => {
        const position = new Locator({href: "https://reader.invalid/epub/OPS/one.xhtml", type: "application/xhtml+xml"});
        const precise = textLocator(position, index("OPS/one.xhtml"), 150)!;
        const cloud = serializeLocatorForCloud(precise, "https://reader.invalid/epub/");
        const restored = deserializeLocatorFromCloud(cloud, "https://reader.invalid/epub/")!;
        expect(restored.text?.highlight).toBe(precise.text?.highlight);
        const doc = new DOMParser().parseFromString(readFileSync(resolve(root, "OPS/one.xhtml"), "utf8"), "text/html");
        expect(preciseLocatorMatches(doc, restored)).toBe(true);
        doc.body.textContent = "Different edition";
        expect(preciseLocatorMatches(doc, restored)).toBe(false);
        const bound = withPublicationIdentity(precise, map);
        const boundRestored = deserializeLocatorFromCloud(serializeLocatorForCloud(bound))!;
        expect(precisePublicationMatches(boundRestored, map)).toBe(true);
        expect(precisePublicationMatches(boundRestored, {...map, fingerprint: "changed"})).toBe(false);
        expect(uniqueAnchorOffset("same same", {version: 1, exact: "same"})).toBeNull();
        const legacy = new Locator({href: position.href, type: position.type, locations: new LocatorLocations({fragments: ["epubcfi(fake)"], progression: 0.4})});
        expect(deserializeLocatorFromCloud(serializeLocatorForCloud(legacy))?.locations.fragments).toEqual([]);
        const pdf = new Locator({href: "book.pdf", type: "application/pdf", locations: new LocatorLocations({position: 17, totalProgression: 0.4})});
        expect(deserializeLocatorFromCloud(serializeLocatorForCloud(pdf))?.locations.position).toBe(17);
    });
});
