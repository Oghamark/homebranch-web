import {useRef, useState, type ReactNode} from "react";
import {Button, HStack, Stack, Text} from "@chakra-ui/react";

export function socialError(error: unknown): string {
    if (typeof error === "object" && error !== null && "data" in error) {
        const data = error.data;
        if (typeof data === "object" && data !== null && "message" in data) {
            if (typeof data.message === "string") return data.message;
            if (Array.isArray(data.message) && data.message.length && data.message.every(item => typeof item === "string")) return data.message.join(" ");
        }
    }
    return "This change couldn't be saved. Please try again.";
}

export function ActionButton({children, run, variant = "outline"}: {
    children: ReactNode; run: () => Promise<unknown>; variant?: "outline" | "solid" | "ghost";
}) {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const pending = useRef(false);
    return <Stack gap={2} align="start">
        <Button minH="44px" variant={variant} colorPalette={variant === "solid" ? "orange" : undefined}
            loading={busy} disabled={busy} onClick={async () => {
                if (pending.current) return;
                pending.current = true;
                setBusy(true); setError("");
                try {await run();} catch (error) {setError(socialError(error));} finally {pending.current = false; setBusy(false);}
            }}>{children}</Button>
        {error && <Text role="alert" color="fg.error" fontSize="sm" maxW="42ch">{error}</Text>}
    </Stack>;
}

export function PersonRow({name, description, children}: {name: string; description?: string; children: ReactNode}) {
    return <HStack justify="space-between" align="start" flexWrap="wrap" gap={3} py={4} borderBottomWidth="1px" minW={0}>
        <Stack gap={1} flex="1" minW="120px"><Text fontWeight="semibold" overflowWrap="anywhere">{name}</Text>
            {description && <Text fontSize="sm" color="fg.muted">{description}</Text>}</Stack>
        <HStack align="start" gap={2} flexWrap="wrap">{children}</HStack>
    </HStack>;
}
