import {axiosErrorHandler} from "./axios";

export interface AuthFormResult {
    error?: string;
    fieldErrors?: Partial<Record<"name" | "email" | "password" | "password_confirmation", string>>;
}

export function validateAuthForm(data: FormData, signup = false): AuthFormResult {
    const value = (name: string) => typeof data.get(name) === "string" ? data.get(name) as string : "";
    const fieldErrors: NonNullable<AuthFormResult["fieldErrors"]> = {};
    if (signup && !value("name").trim()) fieldErrors.name = "Enter your name.";
    if (!value("email").trim()) fieldErrors.email = "Enter your email address.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value("email").trim())) fieldErrors.email = "Enter a valid email address.";
    if (!value("password")) fieldErrors.password = "Enter your password.";
    if (signup && !value("password_confirmation")) fieldErrors.password_confirmation = "Confirm your password.";
    else if (signup && value("password") !== value("password_confirmation")) fieldErrors.password_confirmation = "The passwords do not match.";
    return Object.keys(fieldErrors).length ? {fieldErrors} : {};
}

export function authFailure(error: unknown, fallback: string): AuthFormResult {
    axiosErrorHandler(error);
    const body = (error as {response?: {data?: {message?: unknown}}})?.response?.data;
    const messages = Array.isArray(body?.message) ? body.message : [body?.message];
    const message = messages.filter((item): item is string => typeof item === "string" && !!item.trim()).join(" ");
    return {error: message || fallback};
}
