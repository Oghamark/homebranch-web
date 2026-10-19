import {useEffect, useState} from "react";
import {Box, Button, Input, Stack, Text} from "@chakra-ui/react";
import {useSearchParams} from "react-router";
import {axiosInstance} from "@/shared/api/axios";
import {approvePairing, getDevices, revokeDevice, type Device} from "./api";

export function KoreaderSettings() {
    const [params, setParams] = useSearchParams();
    const [code, setCode] = useState(params.get("code") ?? "");
    const [devices, setDevices] = useState<Device[]>([]);
    const [error, setError] = useState("");
    const [status, setStatus] = useState("");
    const [busy, setBusy] = useState(false);
    const [loaded, setLoaded] = useState(false);
    async function refresh() {
        try { setDevices(await getDevices()); setLoaded(true); setError(""); }
        catch { setError("Unable to load connected readers. Retry when online."); }
    }
    useEffect(() => { void refresh(); }, []);
    async function approve() {
        setBusy(true); setError(""); setStatus("");
        try {
            await approvePairing(code.trim());
            setCode(""); setStatus("Reader approved. Finish pairing on your KOReader device.");
            const next = new URLSearchParams(params); next.delete("code"); setParams(next, {replace: true});
            await refresh();
        } catch { setError("Approval failed. Check the code and its expiry, then retry."); }
        finally { setBusy(false); }
    }
    const root = new URL(`${(axiosInstance.defaults.baseURL ?? "/").replace(/\/$/, "")}/`, window.location.origin);
    return <Stack gap={4}>
        <Text as="h2" fontSize="xl" fontWeight="semibold">KOReader</Text>
        <Text>Start pairing in the Homebranch KOReader plugin, then enter its code here. Approve only a reader you are pairing now. This grants private EPUB progress and annotation sync, not general account access.</Text>
        <label>Reader approval code<Input value={code} maxLength={64} onChange={e => setCode(e.target.value)} autoComplete="off"/></label>
        <Button disabled={!code.trim() || busy} onClick={() => void approve()}>Approve this reader</Button>
        {status && <Text role="status">{status}</Text>}
        {error && <Text role="alert">{error}</Text>}
        <Button variant="outline" disabled={busy} onClick={() => void refresh()}>Refresh devices</Button>
        <Text as="h3" fontWeight="semibold">Connected readers</Text>
        {!loaded && !error && <Text>Loading connected readers...</Text>}
        {loaded && !devices.length && <Text>No connected readers.</Text>}
        {devices.map(device => <Box key={device.id} borderWidth="1px" p={3} borderRadius="md">
            <Text fontWeight="semibold">{device.name}</Text>
            <Text>Paired: {new Date(device.createdAt).toLocaleString()}</Text>
            <Text>Last contact: {device.lastSeenAt ? new Date(device.lastSeenAt).toLocaleString() : "Not yet"}</Text>
            <Text>Expires: {new Date(device.expiresAt).toLocaleString()}</Text>
            <Button disabled={busy} variant="outline" onClick={async () => {
                setBusy(true); setError("");
                try { await revokeDevice(device.id); await refresh(); }
                catch { setError("Unable to revoke this reader. Retry when online."); }
                finally { setBusy(false); }
            }}>Revoke {device.name}</Button>
        </Box>)}
        <Text as="h3" fontWeight="semibold">Setup URLs</Text>
        <Text overflowWrap="anywhere">Plugin sync URL: {new URL("koreader", root).href}</Text>
        <Text overflowWrap="anywhere">OPDS catalog: {new URL("opds/v1/catalog", root).href}</Text>
        <Text>Use your normal OPDS login for browsing and downloads. Pairing provides a separate revocable sync credential. Never enter your Homebranch password in the plugin sync settings. Only EPUB annotations and progress bridge initially; PDF and audio are unchanged.</Text>
    </Stack>;
}
