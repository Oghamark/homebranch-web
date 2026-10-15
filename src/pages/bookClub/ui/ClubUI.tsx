import {useState, type ReactNode} from "react";
import {Box, Button, CloseButton, Dialog, Heading, HStack, Portal, Spinner, Stack, Text} from "@chakra-ui/react";
import {LuBookOpen, LuRefreshCw} from "react-icons/lu";

export const clubPalette = {
    "--chakra-colors-orange-solid": {base: "var(--chakra-colors-orange-700)", _dark: "var(--chakra-colors-orange-400)"},
} as const;

export function EmptyState({title, children, action}: {title: string; children?: ReactNode; action?: ReactNode}) {
    return <Stack align="center" textAlign="center" gap={3} py={{base: 8, md: 12}} px={4} borderWidth="1px" borderStyle="dashed" borderRadius="xl">
        <Box color="fg.muted"><LuBookOpen size={28}/></Box>
        <Heading size="lg" fontFamily="Georgia, serif">{title}</Heading>
        {children && <Text color="fg.muted" maxW="50ch">{children}</Text>}
        {action}
    </Stack>;
}

export function ErrorState({children, onRetry}: {children?: ReactNode; onRetry?: () => unknown}) {
    return <Stack role="alert" gap={3} p={4} borderWidth="1px" borderColor="border.error" borderRadius="lg">
        <Text>{children ?? "We couldn't load this right now. Please try again."}</Text>
        {onRetry && <Button alignSelf="start" variant="outline" minH="44px" onClick={() => onRetry()}><LuRefreshCw/> Try again</Button>}
    </Stack>;
}

export function ClubLoading() {
    return <HStack justify="center" py={12} role="status"><Spinner size="sm"/><Text color="fg.muted">Opening your reading space...</Text></HStack>;
}

export function BookJacket({title, author, compact = false}: {title: string; author: string; compact?: boolean}) {
    return <Box aria-hidden="true" flexShrink={0} w={compact ? "64px" : {base: "100px", md: "136px"}} aspectRatio="2/3"
        borderRadius="sm" bg={{base: "orange.100", _dark: "orange.950"}} color={{base: "orange.950", _dark: "orange.100"}}
        borderLeftWidth="5px" borderLeftColor={{base: "orange.300", _dark: "orange.800"}} boxShadow="sm" p={compact ? 2 : 4}
        display="flex" flexDirection="column" justifyContent="space-between" overflow="hidden">
        <LuBookOpen size={compact ? 16 : 22}/>
        <Stack gap={1}><Text fontFamily="Georgia, serif" fontSize={compact ? "xs" : "md"} lineClamp={compact ? 2 : 4} lineHeight="short">{title}</Text>
            {!compact && <Text fontSize="xs" lineClamp={2}>{author}</Text>}</Stack>
    </Box>;
}

export function ConfirmAction({title, description, actionLabel, onConfirm, children, destructive = false, disabled = false}: {
    title: ReactNode; description: ReactNode; actionLabel: string; onConfirm: () => Promise<unknown>;
    children?: ReactNode; destructive?: boolean; disabled?: boolean;
}) {
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const [failed, setFailed] = useState(false);
    return <Dialog.Root open={open} role="alertdialog" closeOnInteractOutside={!busy} closeOnEscape={!busy}
        onOpenChange={({open: next}) => {if (!busy) {setOpen(next); setFailed(false);}}}>
        <Dialog.Trigger asChild><Button variant="outline" minH="44px" colorPalette={destructive ? "red" : undefined} disabled={disabled}>{children ?? actionLabel}</Button></Dialog.Trigger>
        <Portal><Dialog.Backdrop/><Dialog.Positioner p={4}><Dialog.Content maxW="480px" css={clubPalette}>
            <Dialog.Header><Dialog.Title>{title}</Dialog.Title></Dialog.Header>
            <Dialog.Body><Stack gap={3}><Dialog.Description>{description}</Dialog.Description>
                {failed && <Text role="alert" color="fg.error">The change could not be saved. Please try again.</Text>}</Stack></Dialog.Body>
            <Dialog.Footer flexWrap="wrap">
                <Dialog.ActionTrigger asChild><Button minH="44px" variant="ghost" disabled={busy}>Cancel</Button></Dialog.ActionTrigger>
                <Button minH="44px" colorPalette={destructive ? "red" : "orange"} loading={busy} onClick={async () => {
                    setBusy(true); setFailed(false);
                    try {await onConfirm(); setOpen(false);} catch {setFailed(true);} finally {setBusy(false);}
                }}>{actionLabel}</Button>
            </Dialog.Footer>
            <Dialog.CloseTrigger asChild><CloseButton disabled={busy}/></Dialog.CloseTrigger>
        </Dialog.Content></Dialog.Positioner></Portal>
    </Dialog.Root>;
}
