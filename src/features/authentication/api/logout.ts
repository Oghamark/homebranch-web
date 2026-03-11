import {authenticationAxiosInstance} from "@/features/authentication/api/axios";
import {replace} from "react-router";
import {store} from "@/app/store";
import {homebranchApi} from "@/shared/api/rtk-query";

export async function logout() {
    try {
        await authenticationAxiosInstance.post("/refresh/invalidate");
    } catch (error: any) {
        if (error?.response?.status === 401) {
            // Access token may have expired — refresh it, then retry invalidation
            try {
                await authenticationAxiosInstance.post("/refresh");
                await authenticationAxiosInstance.post("/refresh/invalidate");
            } catch {
                // If refresh also fails both tokens are likely expired; proceed with client cleanup
            }
        }
        // For any other error, fall through to client-side cleanup so the user is always logged out
    }

    sessionStorage.removeItem('user_id');
    sessionStorage.removeItem('user_role');
    store.dispatch(homebranchApi.util.resetApiState());
    return replace('/login');
}
