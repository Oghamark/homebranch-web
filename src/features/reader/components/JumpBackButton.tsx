import { Box, Button, IconButton } from "@chakra-ui/react";
import { LuX } from "react-icons/lu";
import type { ThemeColors } from "../types/ReaderTheme";

interface JumpBackButtonProps {
    onJumpBack: () => void;
    onDismiss: () => void;
    colors: ThemeColors;
    pageLabel?: string;
}

export function JumpBackButton({ onJumpBack, onDismiss, colors, pageLabel }: JumpBackButtonProps) {
    return (
        <Box
            position="fixed"
            bottom={6}
            left={4}
            zIndex={1002}
            w="auto"
            borderRadius="md"
            boxShadow="lg"
            border="1px solid"
            borderColor={colors.uiBorder}
            overflow="hidden"
            bg={colors.uiBg}
            color={colors.text}
        >
            <Button variant="ghost" h="44px" px={4} pr="52px" w="full"
                color={colors.text} _hover={{bg: colors.hoverBg}}
                aria-label={pageLabel ? `Jump back to ${pageLabel}` : "Jump back to previous position"} onClick={onJumpBack}>
            Jump back
            </Button>

            {/* Dismiss button, overlaid at top-right corner */}
            <IconButton
                aria-label="Dismiss jump back"
                size="xs"
                variant="solid"
                bg={colors.btnBg}
                color={colors.text}
                borderRadius="0 4px 0 4px"
                position="absolute"
                top={0}
                right={0}
                zIndex={3}
                minW="44px"
                h="44px"
                p={0}
                _hover={{ bg: colors.btnHoverBg }}
                onClick={(e) => {
                    e.stopPropagation();
                    onDismiss();
                }}
            >
                <LuX size={16} />
            </IconButton>
        </Box>
    );
}
