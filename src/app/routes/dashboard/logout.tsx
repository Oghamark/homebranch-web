import type {Route} from './+types/logout';

import {logout} from "@/features/authentication/api/logout";
import {store} from "@/app/store";
import {authenticationApi, homebranchApi} from "@/shared/api/rtk-query";

export async function clientAction({}: Route.ClientActionArgs) {
    store.dispatch(homebranchApi.util.resetApiState());
    store.dispatch(authenticationApi.util.resetApiState());
    return await logout();
}
