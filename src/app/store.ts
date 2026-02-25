import readerThemeReducer, {registerReaderThemeListeners} from "@/features/reader/store/readerThemeSlice";
import {type Action, configureStore, type ThunkAction} from '@reduxjs/toolkit';

import {listenerMiddleware, startAppListening} from "@/app/listenerMiddleware";
import {authenticationApi, homebranchApi} from "@/shared/api/rtk-query";
import libraryReducer from "@/features/library/store/librarySlice";

registerReaderThemeListeners(startAppListening);

export const store = configureStore({
    reducer: {
        [homebranchApi.reducerPath]: homebranchApi.reducer,
        [authenticationApi.reducerPath]: authenticationApi.reducer,
        library: libraryReducer,
        readerTheme: readerThemeReducer
    },
    middleware: getDefaultMiddleware =>
        getDefaultMiddleware()
            .prepend(listenerMiddleware.middleware)
            .concat(homebranchApi.middleware)
            .concat(authenticationApi.middleware)
})

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export type AppStore = typeof store;
export type AppThunk<ThunkReturnType = void> = ThunkAction<ThunkReturnType, RootState, unknown, Action>;