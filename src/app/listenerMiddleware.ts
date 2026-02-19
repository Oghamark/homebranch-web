import {addListener, createListenerMiddleware} from "@reduxjs/toolkit";
import type {AppDispatch, RootState} from "@/app/store";

export const listenerMiddleware = createListenerMiddleware();

export const startAppListening = listenerMiddleware.startListening.withTypes<
    RootState,
    AppDispatch
>();
export type AppStartListening = typeof startAppListening;

export const addAppListener = addListener.withTypes<RootState, AppDispatch>();
export type AddAppListener = typeof addAppListener;