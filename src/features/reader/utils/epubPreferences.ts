import { EpubPreferences } from "@readium/navigator";
import { TextAlignment } from "@readium/navigator";
import { getThemeColors } from "../types/ReaderTheme";
import type { ReaderThemeState } from "../types/ReaderTheme";

export type EpubPreferencesInput = ConstructorParameters<typeof EpubPreferences>[0];

export function buildEpubPreferences(themeState: ReaderThemeState): EpubPreferencesInput {
    const colors = getThemeColors(themeState.mode);

    const textAlignMap: Record<string, TextAlignment> = {
        start: TextAlignment.start,
        left: TextAlignment.left,
        right: TextAlignment.right,
        justify: TextAlignment.justify,
    };

    return {
        backgroundColor: colors.contentBg,
        textColor: colors.contentText,
        fontFamily: themeState.fontFamily !== "System Default" ? themeState.fontFamily : null,
        fontSize: themeState.fontSize / 100,
        scroll: themeState.scroll,
        columnCount: themeState.columnCount,
        textAlign: themeState.textAlign ? (textAlignMap[themeState.textAlign] ?? null) : null,
        lineHeight: themeState.lineHeight,
        letterSpacing: themeState.letterSpacing,
        wordSpacing: themeState.wordSpacing,
        paragraphSpacing: themeState.paragraphSpacing,
        hyphens: themeState.hyphens,
        pageGutter: themeState.pageGutter ?? 20,
        // In scroll mode the content scrolls within the iframe. Add explicit
        // horizontal scroll padding to match the gutter so margins are
        // consistent across both axes, and add vertical padding so the first
        // and last lines have breathing room at the top/bottom of the scroll
        // area (the outer container already reserves space for UI chrome via
        // pt/pb, so only inner breathing room is needed here).
        ...(themeState.scroll && {
            scrollPaddingLeft: themeState.pageGutter ?? 20,
            scrollPaddingRight: themeState.pageGutter ?? 20,
            scrollPaddingTop: 16,
            scrollPaddingBottom: 16,
        }),
    };
}
