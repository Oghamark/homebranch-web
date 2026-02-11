import type {Route} from './+types/logout';

import {logout} from "@/features/authentication/api/logout";

export async function clientAction({}: Route.ClientActionArgs) {
    return await logout();
}