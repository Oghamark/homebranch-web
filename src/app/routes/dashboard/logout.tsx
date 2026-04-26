import type {Route} from './+types/logout';

import {logout} from "@/features/authentication/api/logout";
import {store} from "@/app/store";
import {homebranchApi} from "@/shared/api/rtk-query";

export async function clientAction({}: Route.ClientActionArgs) {
    store.dispatch(homebranchApi.util.resetApiState());
    return await logout();
}
