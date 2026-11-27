import {useState, type FormEvent} from "react";
import {Button, Stack, Text} from "@chakra-ui/react";
import {Link} from "react-router";
import {config} from "@/shared";
import {AuthLayout} from "@/features/authentication/ui/AuthLayout";
import TextField from "@/shared/ui/TextField";
import {ErrorState} from "@/shared/ui/EditorialUI";

export default function ForgotPassword() {
    const [busy, setBusy] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState("");
    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (busy) return;
        setBusy(true);
        setError("");
        try {
            const response = await fetch(`${config.apiUrl}/password-recovery`, {
                method: "POST", headers: {"Content-Type": "application/json"},
                body: JSON.stringify({email: String(new FormData(event.currentTarget).get("email") ?? "").trim()}),
            });
            if (!response.ok) throw new Error("Recovery request failed");
            setSent(true);
        } catch {
            setError("Password recovery is unavailable. Please try again later.");
        } finally {
            setBusy(false);
        }
    }
    return <AuthLayout title="Reset password" description="Enter the email address for your local account.">
        {sent ? <Text role="status">If an eligible account exists, a reset link will be sent to its email address.</Text> :
            <form onSubmit={submit}><Stack gap={4}>
                {error && <ErrorState>{error}</ErrorState>}
                <TextField label="Email" name="email" type="email" autoComplete="email" required/>
                <Button type="submit" colorPalette="orange" loading={busy} disabled={busy}>Send reset link</Button>
            </Stack></form>}
        <Link to="/login" style={{textDecoration: "underline"}}>Back to sign in</Link>
    </AuthLayout>;
}
