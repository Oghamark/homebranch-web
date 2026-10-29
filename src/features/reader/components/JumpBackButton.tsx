import { Box, Button, IconButton } from "@chakra-ui/react";
import { LuX } from "react-icons/lu";
import type { ThemeColors } from "../types/ReaderTheme";

interface JumpBackButtonProps {
    onJumpBack: () => void;
    onDismiss: () => void;
    colors: ThemeColors;
    pageLabel?: string;
    thumbnailContent?: React.ReactNode;
}

export function JumpBackButton({ onJumpBack, onDismiss, colors, pageLabel, thumbnailContent }: JumpBackButtonProps) {
    return (
        <Box
            position="fixed"
            bottom={6}
            left={4}
            zIndex={1002}
            w="160px"
            borderRadius="md"
            boxShadow="lg"
            border="1px solid"
            borderColor={colors.uiBorder}
            overflow="hidden"
            bg={colors.uiBg}
            color={colors.text}
        >
            <Button variant="ghost" h="auto" p={0} pt={3} w="full" display="flex" flexDirection="column" gap={2}
                color={colors.text} _hover={{bg: colors.hoverBg}}
                aria-label={pageLabel ? `Jump back to ${pageLabel}` : "Jump back to previous position"} onClick={onJumpBack}>
            {/* Page thumbnail */}
            <Box aria-hidden="true" w="80px" bg={colors.contentBg} overflow="hidden" position="relative" lineHeight={0}>
                {thumbnailContent ?? (
                    /* Fallback placeholder styled to match reader theme */
                    <Box w="80px" h="104px" bg={colors.contentBg} p="8px" display="flex" flexDirection="column" gap="4px">
                        {Array.from({ length: 10 }).map((_, i) => (
                            <Box
                                key={i}
                                h="5px"
                                bg={colors.contentText}
                                opacity={0.15}
                                borderRadius="1px"
                                w={i === 9 ? "55%" : "100%"}
                            />
                        ))}
                    </Box>
                )}
            </Box>

            {/* Label strip */}
            {pageLabel && (
                <Box
                    bg={colors.btnBg}
                    color={colors.text}
                    fontSize="xs"
                    textAlign="center"
                    py={3}
                    px={1}
                    userSelect="none"
                    overflow="hidden"
                    whiteSpace="nowrap"
                    textOverflow="ellipsis"
                >
                    Back to {pageLabel}
                </Box>
            )}
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
