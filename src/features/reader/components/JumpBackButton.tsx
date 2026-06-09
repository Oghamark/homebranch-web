import { Flex, IconButton, Text } from "@chakra-ui/react";
import { LuUndo2, LuX } from "react-icons/lu";
import type { ThemeColors } from "../types/ReaderTheme";

interface JumpBackButtonProps {
    label: string;
    onJumpBack: () => void;
    onDismiss: () => void;
    colors: ThemeColors;
}

export function JumpBackButton({ label, onJumpBack, onDismiss, colors }: JumpBackButtonProps) {
    return (
        <Flex
            position="fixed"
            bottom={8}
            left="50%"
            transform="translateX(-50%)"
            zIndex={1002}
            bg={colors.btnBg}
            color={colors.text}
            borderRadius="full"
            boxShadow="lg"
            border="1px solid"
            borderColor={colors.uiBorder}
            align="center"
            gap={1}
            pl={3}
            pr={1}
            py={1}
        >
            <IconButton
                aria-label="Jump back to previous position"
                size="xs"
                variant="ghost"
                color={colors.text}
                borderRadius="full"
                _hover={{ bg: colors.btnHoverBg }}
                onClick={onJumpBack}
            >
                <LuUndo2 />
            </IconButton>
            <Text
                fontSize="xs"
                whiteSpace="nowrap"
                cursor="pointer"
                onClick={onJumpBack}
                userSelect="none"
            >
                {label}
            </Text>
            <IconButton
                aria-label="Dismiss jump back"
                size="xs"
                variant="ghost"
                color={colors.text}
                borderRadius="full"
                _hover={{ bg: colors.btnHoverBg }}
                onClick={onDismiss}
            >
                <LuX />
            </IconButton>
        </Flex>
    );
}
