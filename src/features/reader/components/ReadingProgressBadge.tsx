import {Box, Flex, Text} from "@chakra-ui/react";

interface ReadingProgressBadgeProps {
    percentage: number; // 0–1
}

export function ReadingProgressBadge({percentage}: ReadingProgressBadgeProps) {
    const roundedPercentage = Math.round(percentage * 100);
    return (
        <Box
            position="absolute"
            bottom={0}
            left={0}
            right={0}
            borderBottomRadius="md"
            overflow="hidden"
        >
            <Flex
                bg="rgba(0,0,0,0.70)"
                px={2}
                py={1}
                align="center"
                gap={2}
            >
                <Box flex={1} h="2px" bg="whiteAlpha.400" borderRadius="full">
                    <Box
                        h="100%"
                        w={`${roundedPercentage}%`}
                        bg="blue.400"
                        borderRadius="full"
                    />
                </Box>
                <Text color="white" fontSize="xs" flexShrink={0} minW="28px" textAlign="right">
                    {roundedPercentage}%
                </Text>
            </Flex>
        </Box>
    );
}
