import {useEffect, useState, type FormEvent} from "react";
import {Button, Stack, Text} from "@chakra-ui/react";
import {Link} from "react-router";
import {authenticationAxiosInstance} from "@/features/authentication/api/axios";
import {AuthLayout} from "@/features/authentication/ui/AuthLayout";
import PasswordTextField from "@/shared/ui/PasswordTextField";
import {ErrorState} from "@/shared/ui/EditorialUI";

export default function ResetPassword() {
    const [token] = useState(() => {
        return new URLSearchParams(window.location.hash.slice(1)).get("token") ?? "";
    });
    useEffect(() => {
        window.history.replaceState(window.history.state, "", window.location.pathname);
    }, []);
    const [busy, setBusy] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState("");
    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (busy) return;
        const data = new FormData(event.currentTarget);
        const newPassword = String(data.get("newPassword") ?? "");
        if (newPassword !== data.get("confirmation")) {
            setError("The passwords do not match.");
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
            await authenticationAxiosInstance.post("/password/reset", {token, newPassword});
            setDone(true);
        } catch {
            setError("Could not reset your password. The link may be invalid or expired.");
        } finally {
            setBusy(false);
        }
    }
    return <AuthLayout title="Choose a new password" description="Reset the password for your local account.">
        {done ? <Text role="status">Your password has been reset. You can now sign in.</Text> :
            !token ? <ErrorState>This reset link is invalid. Request a new link.</ErrorState> :
            <form onSubmit={submit}><Stack gap={4}>
                {error && <ErrorState>{error}</ErrorState>}
                <PasswordTextField label="New password" name="newPassword" autoComplete="new-password" minLength={8} maxLength={72} required/>
                <PasswordTextField label="Confirm new password" name="confirmation" autoComplete="new-password" minLength={8} maxLength={72} required/>
                <Text fontSize="sm" color="fg.muted">Use at least 8 characters and no more than 72 UTF-8 bytes.</Text>
                <Button type="submit" colorPalette="orange" loading={busy} disabled={busy}>Reset password</Button>
            </Stack></form>}
        <Link to={done ? "/login" : "/forgot-password"} style={{textDecoration: "underline"}}>{done ? "Sign in" : "Request a new link"}</Link>
    </AuthLayout>;
}
