import {redirect} from "react-router";
import {config} from "@/shared";
import {axiosInstance} from "@/shared/api/axios";
import {logout} from "@/features/authentication/api/logout";

export const INACTIVE_MESSAGE = "Your account is suspended or has no active subscription. Visit your account on our website for details.";
const CHECK_INTERVAL_MS = 60_000;
let lastCheck = 0;

export function isInactiveAccountResponse(status: number | undefined, body: unknown): boolean {
    if (status !== 403) return false;
    const message = typeof body === "string" ? body : JSON.stringify(body ?? "");
    return message.includes("subscription is inactive");
}

/** Ends the session and sends the user to the login page with an explanation. */
export async function rejectInactiveAccount() {
    lastCheck = 0;
    await logout();
    return redirect(`/login?error=${encodeURIComponent(INACTIVE_MESSAGE)}`);
}

/** Cloud only: returns a redirect when the account may not use the app, otherwise null. */
export async function checkCloudAccess() {
    if (!config.cloudMode || Date.now() - lastCheck < CHECK_INTERVAL_MS) return null;
    try {
        await axiosInstance.get("/storage/usage");
        lastCheck = Date.now();
    } catch (error: any) {
        if (isInactiveAccountResponse(error?.response?.status, error?.response?.data)) {
            return rejectInactiveAccount();
        }
    }
    return null;
}
