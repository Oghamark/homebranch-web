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
                role="status"
                aria-live="polite"
                bg={colors.bg}
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
                direction="column"
                gap={3}
                p={6}
                zIndex={1}
                bg={colors.bg}
                color={colors.text}
                role="alert"
            >
                <Text fontFamily="Georgia, serif" fontSize="2xl">This book could not be opened</Text>
                <Text fontSize="sm" maxW="48ch" textAlign="center">
                    {error}
                </Text>
                <Text fontSize="sm" maxW="48ch" textAlign="center">Close the reader to return to the book and try again.</Text>
            </Flex>
        );
    }

    return null;
}
