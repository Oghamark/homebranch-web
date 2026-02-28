export type ThemeColorMode = 'light' | 'dark' | 'sepia';

export interface ReaderThemeState {
    mode: ThemeColorMode;
    fontFamily: string;
    fontSize: number;
}

export interface ThemeColors {
    text: string;
    bg: string;
    contentText: string;
    contentBg: string;
    uiBg: string;
    uiBorder: string;
    hoverText: string;
    hoverBg: string;
    btnBg: string;
    btnHoverBg: string;
    activeBg: string;
    muted: string;
}

const THEME_COLOR_MAP: Record<ThemeColorMode, ThemeColors> = {
    light: {
        text: "#1a202c",
        bg: "#ffffff",
        contentText: "#1a202c",
        contentBg: "#ffffff",
        uiBg: "#f7fafc",
        uiBorder: "#e2e8f0",
        hoverText: "#2d3748",
        hoverBg: "rgba(0,0,0,0.04)",
        btnBg: "rgba(255, 255, 255, 0.8)",
        btnHoverBg: "rgba(237, 242, 247, 1)",
        activeBg: "#edf2f7",
        muted: "#718096",
    },
    dark: {
        text: "#e2e8f0",
        bg: "#1a202c",
        contentText: "#e2e8f0",
        contentBg: "#1a202c",
        uiBg: "#2d3748",
        uiBorder: "#4a5568",
        hoverText: "#e2e8f0",
        hoverBg: "rgba(255,255,255,0.06)",
        btnBg: "rgba(45, 55, 72, 0.8)",
        btnHoverBg: "rgba(45, 55, 72, 1)",
        activeBg: "#4a5568",
        muted: "#a0aec0",
    },
    sepia: {
        text: "#5b4636",
        bg: "#f4ecd8",
        contentText: "#5b4636",
        contentBg: "#f4ecd8",
        uiBg: "#eaddc5",
        uiBorder: "#d5c3aa",
        hoverText: "#483526",
        hoverBg: "rgba(0,0,0,0.04)",
        btnBg: "rgba(234, 221, 197, 0.8)",
        btnHoverBg: "rgba(213, 195, 170, 1)",
        activeBg: "#d5c3aa",
        muted: "#7a5f45",
    },
};

export function getThemeColors(mode: ThemeColorMode): ThemeColors {
    return THEME_COLOR_MAP[mode];
}
