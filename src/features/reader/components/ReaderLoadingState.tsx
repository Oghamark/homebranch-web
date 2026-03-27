import { Flex, Spinner, Text } from "@chakra-ui/react";
import type { ThemeColors } from "../types/ReaderTheme";

interface ReaderLoadingStateProps {
    isLoading: boolean;
    error: string | null;
    colors: ThemeColors;
}

export function ReaderLoadingState({ isLoading, error, colors }: ReaderLoadingStateProps) {
    if (isLoading) {
        return (
            <Flex
                position="absolute"
                top={0}
                left={0}
                right={0}
                bottom={0}
                align="center"
                justify="center"
                direction="column"
                gap={3}
                zIndex={1}
            >
                <Spinner size="lg" color={colors.muted} />
                <Text color={colors.muted} fontSize="sm">
                    Loading book...
                </Text>
            </Flex>
        );
    }

    if (error) {
        return (
            <Flex
                position="absolute"
                top={0}
                left={0}
                right={0}
                bottom={0}
                align="center"
                justify="center"
                zIndex={1}
            >
                <Text color="red.500" fontSize="sm">
                    {error}
                </Text>
            </Flex>
        );
    }

    return null;
}
