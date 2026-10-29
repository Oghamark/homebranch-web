import {defaultSystem} from "@chakra-ui/react";
import {describe, expect, it} from "vitest";
import {system} from "./theme";

function declarationsFor(property: string, value: unknown): unknown[] {
    if (!value || typeof value !== "object") return [];
    return Object.entries(value).flatMap(([key, nested]) => key === property ? [nested] : declarationsFor(property, nested));
}

function luminance(hex: string) {
    const channels = hex.replace("#", "").match(/.{2}/g)!.map(channel => {
        const value = parseInt(channel, 16) / 255;
        return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrast(hex: string, against: number) {
    const foreground = luminance(hex);
    return (Math.max(foreground, against) + 0.05) / (Math.min(foreground, against) + 0.05);
}

describe("shared editorial theme", () => {
    it("emits warm light and dark canvas tokens for all provider content, including portals", () => {
        const css = system.getTokenCss();
        expect(declarationsFor("--chakra-colors-bg", css)).toEqual(expect.arrayContaining(["#faf8f5", "#181512"]));
        expect(declarationsFor("--chakra-colors-bg-panel", css)).toEqual(expect.arrayContaining(["#ffffff", "#211d19"]));
        expect(JSON.stringify(css)).toContain(".dark");
        expect(declarationsFor("--chakra-colors-orange-solid", css)).toEqual(expect.arrayContaining([
            "var(--chakra-colors-orange-700)", "var(--chakra-colors-orange-400)",
        ]));
        expect(declarationsFor("--chakra-colors-orange-contrast", css)).toEqual(expect.arrayContaining([
            "var(--chakra-colors-white)", "var(--chakra-colors-black)",
        ]));
    });

    it("provides AA contrast for solid orange action labels in both themes", () => {
        expect(contrast(system.token("colors.orange.700"), 1)).toBeGreaterThanOrEqual(4.5);
        expect(contrast(system.token("colors.orange.400"), 0)).toBeGreaterThanOrEqual(4.5);
    });

    it("keeps small secondary labels readable on warm surfaces in both themes", () => {
        const css = system.getTokenCss();
        expect(declarationsFor("--chakra-colors-fg-subtle", css)).toEqual(expect.arrayContaining(["#695c50", "#b8aa9b"]));
        for (const background of ["#faf8f5", "#ffffff", "#f5f1eb", "#efe9e1", "#e5dcd0"]) {
            expect(contrast("#695c50", luminance(background))).toBeGreaterThanOrEqual(4.5);
        }
        for (const background of ["#181512", "#211d19", "#2b2520", "#3b322a"]) {
            expect(contrast("#b8aa9b", luminance(background))).toBeGreaterThanOrEqual(4.5);
        }
    });

    it("changes heading typography without overriding body, preflight, reader content or compact button recipes", () => {
        expect(system.token("fonts.heading")).toBe("Georgia, 'Times New Roman', serif");
        expect(system.token("fonts.body")).toBe(defaultSystem.token("fonts.body"));
        expect(system.getGlobalCss()).toEqual(defaultSystem.getGlobalCss());
        expect(system.getPreflightCss()).toEqual(defaultSystem.getPreflightCss());
        expect(system.getRecipe("button")).toEqual(defaultSystem.getRecipe("button"));
    });
});
