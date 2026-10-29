import {useId, useRef, useState, type ReactNode} from "react";
import {Box, Button, CloseButton, Dialog, Flex, Heading, HStack, Image, Portal, Spinner, Stack, Text} from "@chakra-ui/react";
import {LuBookOpen, LuRefreshCw} from "react-icons/lu";

export interface PageHeaderProps {
    title: ReactNode;
    description?: ReactNode;
    actions?: ReactNode;
}

export function PageHeader({title, description, actions}: PageHeaderProps) {
    return <Flex as="header" align="start" justify="space-between" gap={4} wrap="wrap" minW={0}>
        <Stack gap={2} minW={0}>
            <Heading as="h1" size={{base: "2xl", md: "3xl"}} lineHeight="short" overflowWrap="anywhere">{title}</Heading>
            {description && <Text color="fg.muted" maxW="65ch">{description}</Text>}
        </Stack>
        {actions && <HStack gap={2} wrap="wrap">{actions}</HStack>}
    </Flex>;
}

export interface PageSectionProps extends PageHeaderProps {
    children: ReactNode;
    id?: string;
}

export function PageSection({title, description, actions, children, id}: PageSectionProps) {
    const headingId = useId();
    return <Stack as="section" id={id} aria-labelledby={headingId} gap={4} minW={0}>
        <Flex align="start" justify="space-between" gap={3} wrap="wrap">
            <Stack gap={2} minW={0}>
                <Heading as="h2" id={headingId} size="xl" overflowWrap="anywhere">{title}</Heading>
                {description && <Text color="fg.muted" maxW="65ch">{description}</Text>}
            </Stack>
            {actions && <HStack gap={2} wrap="wrap">{actions}</HStack>}
        </Flex>
        {children}
    </Stack>;
}

export interface EmptyStateProps {
    title: string;
    children?: ReactNode;
    action?: ReactNode;
}

export function EmptyState({title, children, action}: EmptyStateProps) {
    return <Stack align="center" textAlign="center" gap={3} py={{base: 8, md: 12}} px={4} borderWidth="1px" borderStyle="dashed" borderRadius="xl">
        <Box color="fg.muted" aria-hidden="true"><LuBookOpen size={28}/></Box>
        <Heading size="lg">{title}</Heading>
        {children && <Text color="fg.muted" maxW="50ch">{children}</Text>}
        {action}
    </Stack>;
}

export interface ErrorStateProps {
    children?: ReactNode;
    onRetry?: () => unknown;
}

export function ErrorState({children, onRetry}: ErrorStateProps) {
    return <Stack role="alert" gap={3} p={4} borderWidth="1px" borderColor="border.error" borderRadius="lg">
        <Text>{children ?? "We couldn't load this right now. Please try again."}</Text>
        {onRetry && <Button alignSelf="start" variant="outline" minH="44px" onClick={() => onRetry()}><LuRefreshCw/> Try again</Button>}
    </Stack>;
}

export interface LoadingStateProps {
    label?: string;
}

export function LoadingState({label = "Loading..."}: LoadingStateProps) {
    return <HStack justify="center" py={12} role="status" aria-live="polite"><Spinner size="sm" aria-hidden="true"/><Text color="fg.muted">{label}</Text></HStack>;
}

export interface BookJacketProps {
    title: string;
    author: string;
    compact?: boolean;
    coverSrc?: string;
}

export function BookJacket({title, author, compact = false, coverSrc}: BookJacketProps) {
    const [failedSrc, setFailedSrc] = useState<string>();
    if (coverSrc && coverSrc !== failedSrc) return <Box aria-hidden="true" flexShrink={0}
        w={compact ? "64px" : {base: "100px", md: "136px"}} aspectRatio="2/3"
        borderRadius="sm" bg="bg.muted" boxShadow="sm" overflow="hidden">
        <Image src={coverSrc} alt="" w="full" h="full" objectFit="contain"
            onError={() => setFailedSrc(coverSrc)}/>
    </Box>;
    return <Box aria-hidden="true" flexShrink={0} w={compact ? "64px" : {base: "100px", md: "136px"}} aspectRatio="2/3"
        borderRadius="sm" bg={{base: "orange.100", _dark: "orange.950"}} color={{base: "orange.950", _dark: "orange.100"}}
        borderLeftWidth="5px" borderLeftColor={{base: "orange.300", _dark: "orange.800"}} boxShadow="sm" p={compact ? 2 : 4}
        display="flex" flexDirection="column" justifyContent="space-between" overflow="hidden">
        <LuBookOpen size={compact ? 16 : 22}/>
        <Stack gap={1}><Text fontFamily="heading" fontSize={compact ? "xs" : "md"} lineClamp={compact ? 2 : 4} lineHeight="short">{title}</Text>
            {!compact && <Text fontSize="xs" lineClamp={2}>{author}</Text>}</Stack>
    </Box>;
}

export interface ConfirmActionProps {
    title: ReactNode;
    description: ReactNode;
    actionLabel: string;
    /** Reject or return false on failure. Other resolved values indicate success. */
    onConfirm: () => Promise<unknown>;
    children?: ReactNode;
    destructive?: boolean;
    disabled?: boolean;
    errorText?: ReactNode;
}

export function ConfirmAction({title, description, actionLabel, onConfirm, children, destructive = false, disabled = false,
    errorText = "The change could not be saved. Please try again."}: ConfirmActionProps) {
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const [failed, setFailed] = useState(false);
    const pending = useRef(false);
    const cancelRef = useRef<HTMLButtonElement>(null);

    async function confirm() {
        if (pending.current) return;
        pending.current = true;
        setBusy(true);
        setFailed(false);
        try {
            if (await onConfirm() === false) setFailed(true);
            else setOpen(false);
        } catch {
            setFailed(true);
        } finally {
            pending.current = false;
            setBusy(false);
        }
    }

    return <Dialog.Root open={open} role="alertdialog" initialFocusEl={() => cancelRef.current}
        closeOnInteractOutside={!busy} closeOnEscape={!busy}
        onOpenChange={({open: next}) => {if (!pending.current) {setOpen(next); setFailed(false);}}}>
        <Dialog.Trigger asChild><Button variant="outline" minH="44px" colorPalette={destructive ? "red" : undefined} disabled={disabled}>{children ?? actionLabel}</Button></Dialog.Trigger>
        <Portal><Dialog.Backdrop/><Dialog.Positioner p={4}><Dialog.Content maxW="480px" aria-busy={busy}>
            <Dialog.Header><Dialog.Title>{title}</Dialog.Title></Dialog.Header>
            <Dialog.Body><Stack gap={3}><Dialog.Description>{description}</Dialog.Description>
                {failed && <Text role="alert" color="fg.error">{errorText}</Text>}</Stack></Dialog.Body>
            <Dialog.Footer flexWrap="wrap">
                <Dialog.ActionTrigger asChild><Button ref={cancelRef} minH="44px" variant="ghost" disabled={busy}>Cancel</Button></Dialog.ActionTrigger>
                <Button minH="44px" colorPalette={destructive ? "red" : "orange"} loading={busy} loadingText={actionLabel} disabled={busy} onClick={confirm}>{actionLabel}</Button>
            </Dialog.Footer>
            <Dialog.CloseTrigger asChild><CloseButton aria-label="Close confirmation" minH="44px" minW="44px" disabled={busy}/></Dialog.CloseTrigger>
        </Dialog.Content></Dialog.Positioner></Portal>
    </Dialog.Root>;
}
