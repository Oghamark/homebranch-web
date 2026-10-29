import {describe, expect, it} from "vitest";
import {Locator, LocatorLocations} from "@readium/shared";
import {approximateProgressLocator} from "./approximateProgress";

const position = (href: string, locations: {totalProgression?: number; progression?: number}) =>
    new Locator({href, type: "application/xhtml+xml", locations: new LocatorLocations(locations)});
describe("approximate cross-reader progress", () => {
    it("resolves a total fraction to the actual chapter and within-chapter progression", () => {
        const result = approximateProgressLocator([position("one.xhtml", {totalProgression: 0}), position("two.xhtml", {totalProgression: 0.4}), position("three.xhtml", {totalProgression: 0.8})], 0.6);
        expect(result?.href).toBe("two.xhtml");
        expect(result?.locations.totalProgression).toBe(0.6);
        expect(result?.locations.progression).toBeCloseTo(0.5);
        expect(result?.text).toBeUndefined();
    });
    it("falls back to progression and handles book boundaries and invalid input", () => {
        const positions = [position("one.xhtml", {progression: 0}), position("two.xhtml", {progression: 0.5})];
        expect(approximateProgressLocator(positions, 0)?.href).toBe("one.xhtml");
        expect(approximateProgressLocator(positions, 1)?.locations.progression).toBe(1);
        expect(approximateProgressLocator(positions, NaN)).toBeNull();
        expect(approximateProgressLocator(positions, -0.1)).toBeNull();
        expect(approximateProgressLocator(positions, 1.1)).toBeNull();
        expect(approximateProgressLocator([], 0.5)).toBeNull();
    });
});
