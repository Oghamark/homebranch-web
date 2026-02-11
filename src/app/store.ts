import {type Action, configureStore, type ThunkAction} from '@reduxjs/toolkit';

import {listenerMiddleware} from "@/app/listenerMiddleware";
import {homebranchApi} from "@/shared/api/rtk-query";
import libraryReducer from "@/features/library/store/librarySlice";

export const store = configureStore({
    reducer: {
        [homebranchApi.reducerPath]: homebranchApi.reducer,
        library: libraryReducer
    },
    middleware: getDefaultMiddleware =>
        getDefaultMiddleware()
            .prepend(listenerMiddleware.middleware)
            .concat(homebranchApi.middleware)
})

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export type AppStore = typeof store;
export type AppThunk<ThunkReturnType = void> = ThunkAction<ThunkReturnType, RootState, unknown, Action>;