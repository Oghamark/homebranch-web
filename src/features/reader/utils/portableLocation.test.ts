import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {describe, expect, it} from "vitest";
import {Locator, LocatorLocations} from "@readium/shared";
import type {LocationMap, PortableLocation} from "../types/PortableLocation";
import {canonicalHref, canonicalText, capturePortableLocation, chapterAt, compatibleLocation, preciseLocatorMatches, precisePublicationMatches, resolvePortableTarget, textLocator, uniqueAnchorOffset, verifiedResource, withPublicationIdentity} from "./portableLocation";
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
