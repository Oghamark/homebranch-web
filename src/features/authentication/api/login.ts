import {LoginDto} from "@/features/authentication/dtos";
import {authenticationAxiosInstance, axiosErrorHandler} from "@/features/authentication/api/axios";
import {replace} from "react-router";

export async function login(formData: FormData) {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    const loginDto = new LoginDto(email, password);

    return await authenticationAxiosInstance.post("/login", loginDto)
        .then(response => {
            const responseData = response.data;
            if (responseData.success) {
                sessionStorage.setItem('user_id', responseData.value.userId);
                try {
                    const payload = JSON.parse(atob(responseData.value.accessToken.split('.')[1]));
                    sessionStorage.setItem('user_role', payload.roles?.[0] ?? 'USER');
                } catch {
                    sessionStorage.setItem('user_role', 'USER');
                }
                return replace('/');
            }

        })
        .catch(axiosErrorHandler);
}