import {useState, type FormEvent} from "react";
import {Button, Stack, Text} from "@chakra-ui/react";
import {useNavigate} from "react-router";
import {authenticationAxiosInstance} from "@/features/authentication/api/axios";
import PasswordTextField from "@/shared/ui/PasswordTextField";
import {ErrorState, PageSection} from "@/shared/ui/EditorialUI";

export function ChangePassword() {
    const navigate = useNavigate();
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (busy) return;
        const form = event.currentTarget;
        const data = new FormData(form);
        const currentPassword = String(data.get("currentPassword") ?? "");
        const newPassword = String(data.get("newPassword") ?? "");
        if (newPassword !== data.get("confirmation")) {
            setError("The new passwords do not match.");
            return;
        }
        if (Array.from(newPassword).length < 8) {
            setError("The new password must contain at least 8 characters.");
            return;
        }
        if (new TextEncoder().encode(newPassword).length > 72) {
            setError("The new password must be at most 72 UTF-8 bytes.");
            return;
        }
        setBusy(true);
        setError("");
        try {
            const [{store}, {authenticationApi, homebranchApi}] = await Promise.all([
                import("@/app/store"), import("@/shared/api/rtk-query"),
            ]);
            const request = () => authenticationAxiosInstance.post("/password/change", {currentPassword, newPassword});
            try {
                await request();
            } catch (error: unknown) {
                if ((error as {response?: {status?: number}}).response?.status !== 401) throw error;
                await authenticationAxiosInstance.post("/refresh");
                await request();
            }
            sessionStorage.removeItem("user_id");
            sessionStorage.removeItem("user_role");
            store.dispatch(homebranchApi.util.resetApiState());
            store.dispatch(authenticationApi.util.resetApiState());
            navigate("/login", {replace: true});
        } catch (error: unknown) {
            const status = (error as {response?: {status?: number}}).response?.status;
            setError(status === 400 ? "Your current password is incorrect." :
                status === 401 ? "Your session has expired. Sign in again." : "Could not change your password. Please try again.");
        } finally {
            setBusy(false);
        }
    }

    return <PageSection title="Change password" description="Change your local account password. You will need to sign in again.">
        <form onSubmit={submit}>
            <Stack gap={4}>
                {error && <ErrorState>{error}</ErrorState>}
                <PasswordTextField label="Current password" name="currentPassword" autoComplete="current-password" required/>
                <PasswordTextField label="New password" name="newPassword" autoComplete="new-password" minLength={8} maxLength={72} required/>
                <PasswordTextField label="Confirm new password" name="confirmation" autoComplete="new-password" minLength={8} maxLength={72} required/>
                <Text fontSize="sm" color="fg.muted">Use at least 8 characters and no more than 72 UTF-8 bytes.</Text>
                <Button type="submit" colorPalette="orange" loading={busy} disabled={busy}>Change password</Button>
            </Stack>
        </form>
    </PageSection>;
}
