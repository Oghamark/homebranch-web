import {SignUpDto} from "@/features/authentication/dtos";
import {authenticationAxiosInstance} from "@/features/authentication/api/axios";
import {redirect} from "react-router";
import {authFailure, validateAuthForm} from "./formFeedback";

export default async function signUp(formData: FormData) {
    const validation = validateAuthForm(formData, true);
    if (validation.fieldErrors) return validation;
    const name = formData.get('name');
    const email = formData.get('email');
    const password = formData.get('password');
    const password_confirmation = formData.get('password_confirmation');

    if (
        typeof name !== 'string' ||
        typeof email !== 'string' ||
        typeof password !== 'string' ||
        typeof password_confirmation !== 'string'
    ) {
        throw new Error('Missing required form fields');
    }
    const signUpDto: SignUpDto = new SignUpDto(name, email, password, password_confirmation);

    return authenticationAxiosInstance.post('/sign-up', signUpDto)
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
                return redirect("/")
            }
            return {error: "We couldn't create your account. Check your details and try again."};
        })
        .catch(error => authFailure(error, "We couldn't create your account. Please try again."));

}