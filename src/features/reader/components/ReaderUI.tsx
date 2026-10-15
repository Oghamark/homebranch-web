import {Button, Dialog, Portal} from "@chakra-ui/react";
import type {ReactNode} from "react";
import {LuX} from "react-icons/lu";
import {getThemeColors, type ThemeColors, type ThemeColorMode} from "../types/ReaderTheme";

export function getReaderControlColors(mode: ThemeColorMode): ThemeColors {
    const colors = getThemeColors(mode);
    if (mode === "sepia") return {...colors, muted: "#72583f"};
    return {...colors, ...(mode === "dark"
        ? {uiBg: "#292622", uiBorder: "#62574a", btnBg: "#292622", btnHoverBg: "#3c352e", activeBg: "#4c4032", hoverBg: "#3c352e", muted: "#c0b5a6"}
        : {uiBg: "#fffaf2", uiBorder: "#ded2c0", btnBg: "#fffaf2", btnHoverBg: "#f2e6d4", activeBg: "#eddec6", hoverBg: "#f2e6d4", muted: "#665c50"})};
}

// Keep control surfaces independent of the application theme and book typography.
export function readerSurface(colors: ThemeColors) {
    return {
        bg: colors.uiBg,
        color: colors.text,
        borderColor: colors.uiBorder,
        fontFamily: "system-ui, sans-serif",
        colorScheme: colors.bg === "#1a202c" ? "dark" : "light",
        css: {
            "& button, & input": {minHeight: "44px"},
            "& button": {minWidth: "44px"},
            "& button:focus-visible, & input:focus-visible, & summary:focus-visible": {
                outline: `2px solid ${colors.text}`,
                outlineOffset: "3px",
            },
        },
    };
}

interface ReaderDialogProps {
    open: boolean;
    onClose: () => void;
    title: string;
    colors: ThemeColors;
    children: ReactNode;
    footer?: ReactNode;
}

export function ReaderDialog({open, onClose, title, colors, children, footer}: ReaderDialogProps) {
    return <Dialog.Root open={open} onOpenChange={({open: next}) => !next && onClose()}
        placement="center" scrollBehavior="inside" size="md">
        <Portal>
            <Dialog.Backdrop zIndex={1100} bg="blackAlpha.600"/>
            <Dialog.Positioner zIndex={1101} p={3}>
                <Dialog.Content data-reader-dialog {...readerSurface(colors)} borderWidth="1px" borderRadius="xl"
                    maxH="calc(100dvh - 24px)" onKeyDown={(event) => {
                        if (event.key === "Escape") {
                            event.preventDefault();
                            onClose();
                        }
                        event.stopPropagation();
                    }}>
                    <Dialog.Header pr={16}>
                        <Dialog.Title fontFamily="Georgia, serif" fontSize="2xl" color={colors.text}>{title}</Dialog.Title>
                    </Dialog.Header>
                    <Dialog.Body pb={6}>{children}</Dialog.Body>
                    {footer && <Dialog.Footer flexWrap="wrap">{footer}</Dialog.Footer>}
                    <Dialog.CloseTrigger asChild>
                        <Button aria-label={`Close ${title.toLowerCase()}`} position="absolute" right={2} top={2}
                            minW="44px" variant="ghost" color={colors.text} bg="transparent"
                            _hover={{bg: colors.hoverBg}}><LuX/></Button>
                    </Dialog.CloseTrigger>
                </Dialog.Content>
            </Dialog.Positioner>
        </Portal>
    </Dialog.Root>;
}
