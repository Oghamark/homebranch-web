import { Box, Text } from "@chakra-ui/react";
import type { ThemeColors } from "../types/ReaderTheme";

interface ReaderProgressBarProps {
    percentage: number | undefined;
    colors: ThemeColors;
}

export function ReaderProgressBar({ percentage, colors }: ReaderProgressBarProps) {
    if (percentage === undefined) return null;

    return (
        <>
            <Box
                position="fixed"
                bottom={0}
                left={0}
                right={0}
                h="3px"
                bg={colors.uiBg}
                zIndex={1002}
            >
                <Box
                    h="100%"
                    w={`${Math.round(percentage * 100)}%`}
                    bg={colors.muted}
                    transition="width 0.4s ease"
                />
            </Box>
            <Text
                position="fixed"
                bottom={1}
                right={2}
                fontSize="xs"
                color={colors.muted}
                zIndex={1002}
                userSelect="none"
            >
                {Math.round(percentage * 100)}%
            </Text>
        </>
    );
}
