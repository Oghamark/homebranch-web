import { createSlice, isAnyOf, type PayloadAction } from '@reduxjs/toolkit';
import type { AppStartListening } from '@/app/listenerMiddleware';
import type { ReaderThemeState, TextAlignPreference, ThemeColorMode } from '../types/ReaderTheme';

const THEME_STORAGE_KEY = 'reader_theme_prefs';

const loadInitialState = (): ReaderThemeState => {
    const isSystemDark = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const defaultState: ReaderThemeState = {
        mode: isSystemDark ? 'dark' : 'light',
        fontFamily: 'System Default',
        fontSize: 100,
        scroll: false,
        columnCount: null,
        textAlign: null,
        lineHeight: null,
        letterSpacing: null,
        wordSpacing: null,
        paragraphSpacing: null,
        hyphens: null,
        pageGutter: null,
    };

    if (typeof window === 'undefined') {
        return defaultState;
    }

    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            // Deep merge to ensure no property is ever undefined
            return { ...defaultState, ...parsed };
        } catch {
            // Fallthrough to defaults
        }
    }

    return defaultState;
};

const initialState: ReaderThemeState = loadInitialState();

const readerThemeSlice = createSlice({
    name: 'readerTheme',
    initialState,
    reducers: {
        setThemeMode(state, action: PayloadAction<ThemeColorMode>) {
            state.mode = action.payload;
        },
        setFontFamily(state, action: PayloadAction<string>) {
            state.fontFamily = action.payload;
        },
        setFontSize(state, action: PayloadAction<number>) {
            state.fontSize = action.payload;
        },
        setScroll(state, action: PayloadAction<boolean>) {
            state.scroll = action.payload;
        },
        setColumnCount(state, action: PayloadAction<1 | 2 | null>) {
            state.columnCount = action.payload;
        },
        setTextAlign(state, action: PayloadAction<TextAlignPreference>) {
            state.textAlign = action.payload;
        },
        setLineHeight(state, action: PayloadAction<number | null>) {
            state.lineHeight = action.payload;
        },
        setLetterSpacing(state, action: PayloadAction<number | null>) {
            state.letterSpacing = action.payload;
        },
        setWordSpacing(state, action: PayloadAction<number | null>) {
            state.wordSpacing = action.payload;
        },
        setParagraphSpacing(state, action: PayloadAction<number | null>) {
            state.paragraphSpacing = action.payload;
        },
        setHyphens(state, action: PayloadAction<boolean | null>) {
            state.hyphens = action.payload;
        },
        setPageGutter(state, action: PayloadAction<number | null>) {
            state.pageGutter = action.payload;
        },
    }
});

export const {
    setThemeMode,
    setFontFamily,
    setFontSize,
    setScroll,
    setColumnCount,
    setTextAlign,
    setLineHeight,
    setLetterSpacing,
    setWordSpacing,
    setParagraphSpacing,
    setHyphens,
    setPageGutter,
} = readerThemeSlice.actions;

export function registerReaderThemeListeners(startListening: AppStartListening) {
    startListening({
        matcher: isAnyOf(
            setThemeMode,
            setFontFamily,
            setFontSize,
            setScroll,
            setColumnCount,
            setTextAlign,
            setLineHeight,
            setLetterSpacing,
            setWordSpacing,
            setParagraphSpacing,
            setHyphens,
            setPageGutter,
        ),
        effect: (_action, listenerApi) => {
            localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(listenerApi.getState().readerTheme));
        },
    });
}

export default readerThemeSlice.reducer;
