import {LoginDto} from "@/features/authentication/dtos";
import {authenticationAxiosInstance, axiosErrorHandler} from "@/features/authentication/api/axios";
import {redirect} from "react-router";

export async function login(formData: FormData) {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    const loginDto = new LoginDto(email, password);

    await authenticationAxiosInstance.post("/login", loginDto).catch(axiosErrorHandler);

    return redirect("/");
}