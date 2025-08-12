import {SignUpDto} from "@/features/authentication/dtos";
import {authenticationAxiosInstance, axiosErrorHandler} from "@/features/authentication/api/axios";
import {redirect} from "react-router";

export default async function signUp(formData: FormData) {
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const password_confirmation = formData.get('password_confirmation') as string;

    const signUpDto: SignUpDto = new SignUpDto(name, email, password, password_confirmation);

   return authenticationAxiosInstance.post('/sign-up', signUpDto)
        .then(response => {
            const responseData = response.data;
            if(responseData.success){
                sessionStorage.setItem('user_id', responseData.data.userId);
                redirect("/")
            }
        })
        .catch(axiosErrorHandler);

}