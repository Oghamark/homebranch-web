import { Box, Flex, Text, IconButton } from "@chakra-ui/react";
import { LuX } from "react-icons/lu";
import type { EpubNavigator } from "@readium/navigator";
import type { Link } from "@readium/shared";
import type { ThemeColors } from "../types/ReaderTheme";

interface TocEntryProps {
    link: Link;
    depth: number;
    navigatorRef: React.RefObject<EpubNavigator | null>;
    onNavigate: () => void;
    colors: ThemeColors;
}

function TocEntry({ link, depth, navigatorRef, onNavigate, colors }: TocEntryProps) {
    const children = link.children?.items ?? [];

    const handleClick = () => {
        navigatorRef.current?.goLink(link, false, () => {});
        onNavigate();
    };

    return (
        <Box>
            <Box
                as="button"
                w="100%"
                textAlign="left"
                px={3}
                py={2}
                pl={`${12 + depth * 16}px`}
                fontSize="sm"
                color={colors.text}
                borderRadius="md"
                _hover={{ bg: colors.hoverBg }}
                onClick={handleClick}
            >
                {link.title ?? link.href}
            </Box>
            {children.map((child, index) => (
                <TocEntry
                    key={`${child.href}-${index}`}
                    link={child}
                    depth={depth + 1}
                    navigatorRef={navigatorRef}
                    onNavigate={onNavigate}
                    colors={colors}
                />
            ))}
        </Box>
    );
}

interface ReaderTocProps {
    isOpen: boolean;
    onClose: () => void;
    tocItems: Link[];
    navigatorRef: React.RefObject<EpubNavigator | null>;
    colors: ThemeColors;
}

export function ReaderToc({ isOpen, onClose, tocItems, navigatorRef, colors }: ReaderTocProps) {
    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <Box
                position="fixed"
                inset={0}
                zIndex={1003}
                onClick={onClose}
            />

            {/* Drawer */}
            <Box
                position="fixed"
                top={0}
                left={0}
                h="100dvh"
                w={{ base: "80vw", md: "320px" }}
                maxW="320px"
                zIndex={1004}
                bg={colors.uiBg}
                color={colors.text}
                boxShadow="xl"
                display="flex"
                flexDirection="column"
            >
                <Flex
                    align="center"
                    justify="space-between"
                    px={4}
                    py={3}
                    borderBottom="1px solid"
                    borderColor={colors.uiBorder}
                    flexShrink={0}
                >
                    <Text fontWeight="semibold" fontSize="sm">
                        Table of Contents
                    </Text>
                    <IconButton
                        aria-label="Close table of contents"
                        size="sm"
                        variant="ghost"
                        color={colors.text}
                        _hover={{ bg: colors.hoverBg }}
                        onClick={onClose}
                    >
                        <LuX />
                    </IconButton>
                </Flex>

                <Box flex={1} overflowY="auto" py={2}>
                    {tocItems.length === 0 ? (
                        <Text px={4} py={3} fontSize="sm" opacity={0.6}>
                            No table of contents available.
                        </Text>
                    ) : (
                        tocItems.map((link, index) => (
                            <TocEntry
                                key={`${link.href}-${index}`}
                                link={link}
                                depth={0}
                                navigatorRef={navigatorRef}
                                onNavigate={onClose}
                                colors={colors}
                            />
                        ))
                    )}
                </Box>
            </Box>
        </>
    );
}
