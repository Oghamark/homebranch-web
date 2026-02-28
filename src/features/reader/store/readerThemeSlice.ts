import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AppStartListening } from '@/app/listenerMiddleware';
import type { ReaderThemeState, ThemeColorMode } from '../types/ReaderTheme';

const THEME_STORAGE_KEY = 'reader_theme_prefs';

const loadInitialState = (): ReaderThemeState => {
    const isSystemDark = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const defaultState: ReaderThemeState = {
        mode: isSystemDark ? 'dark' : 'light',
        fontFamily: 'System Default',
        fontSize: 100
    };

    if (typeof window === 'undefined') {
        return defaultState;
    }

    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            // Deep merge to ensure no property is ever undefined
            // (Prevents "undefined%" crashing epub.js layout computation)
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
        }
    }
});

export const { setThemeMode, setFontFamily, setFontSize } = readerThemeSlice.actions;

export function registerReaderThemeListeners(startListening: AppStartListening) {
    startListening({
        actionCreator: setThemeMode,
        effect: (_action, listenerApi) => {
            localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(listenerApi.getState().readerTheme));
        },
    });
    startListening({
        actionCreator: setFontFamily,
        effect: (_action, listenerApi) => {
            localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(listenerApi.getState().readerTheme));
        },
    });
    startListening({
        actionCreator: setFontSize,
        effect: (_action, listenerApi) => {
            localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(listenerApi.getState().readerTheme));
        },
    });
}

export default readerThemeSlice.reducer;
