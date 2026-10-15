import {LoginDto} from "@/features/authentication/dtos";
import {authenticationAxiosInstance} from "@/features/authentication/api/axios";
import {replace} from "react-router";
import {authFailure, validateAuthForm} from "./formFeedback";

export async function login(formData: FormData) {
    const validation = validateAuthForm(formData);
    if (validation.fieldErrors) return validation;
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
                    sessionStorage.setItem('user_role', payload.role ?? 'USER');
                } catch {
                    sessionStorage.setItem('user_role', 'USER');
                }
                return replace('/');
            }
            return {error: "We couldn't sign you in. Check your details and try again."};
        })
        .catch(error => authFailure(error, "We couldn't sign you in. Please try again."));
}