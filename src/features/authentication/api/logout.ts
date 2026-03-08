import {authenticationAxiosInstance, axiosErrorHandler} from "@/features/authentication/api/axios";
import {replace} from "react-router";
import {store} from "@/app/store";
import {homebranchApi} from "@/shared/api/rtk-query";

export async function logout() {
    return await authenticationAxiosInstance.post("/refresh/invalidate").then(response => {
        sessionStorage.removeItem('user_id');
        store.dispatch(homebranchApi.util.resetApiState());
        return replace('/login');
    }).catch(axiosErrorHandler);
}
