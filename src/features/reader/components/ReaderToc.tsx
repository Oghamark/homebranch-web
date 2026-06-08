import { Box, Flex, Text, IconButton } from "@chakra-ui/react";
import { LuX } from "react-icons/lu";
import type { ThemeColors } from "../types/ReaderTheme";

export interface ReaderTocItem {
    id: string;
    label: string;
    children?: ReaderTocItem[];
}

interface TocEntryProps<TItem extends ReaderTocItem> {
    item: TItem;
    depth: number;
    getChildren: (item: TItem) => TItem[] | undefined;
    onNavigate: (item: TItem) => void;
    isNavigationDisabled: boolean;
    colors: ThemeColors;
}

function TocEntry<TItem extends ReaderTocItem>({
    item,
    depth,
    getChildren,
    onNavigate,
    isNavigationDisabled,
    colors,
}: TocEntryProps<TItem>) {
    const children = getChildren(item) ?? [];

    const handleClick = () => {
        if (isNavigationDisabled) return;
        onNavigate(item);
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
                aria-disabled={isNavigationDisabled}
                opacity={isNavigationDisabled ? 0.6 : 1}
                cursor={isNavigationDisabled ? "not-allowed" : "pointer"}
                _hover={isNavigationDisabled ? undefined : { bg: colors.hoverBg }}
                onClick={handleClick}
            >
                {item.label}
            </Box>
            {children.map((child, index) => (
                <TocEntry
                    key={`${child.id}-${index}`}
                    item={child}
                    depth={depth + 1}
                    getChildren={getChildren}
                    onNavigate={onNavigate}
                    isNavigationDisabled={isNavigationDisabled}
                    colors={colors}
                />
            ))}
        </Box>
    );
}

interface ReaderTocProps<TItem extends ReaderTocItem> {
    isOpen: boolean;
    onClose: () => void;
    tocItems: TItem[];
    getChildren: (item: TItem) => TItem[] | undefined;
    onNavigate: (item: TItem) => void;
    isNavigationDisabled?: boolean;
    colors: ThemeColors;
    title?: string;
}

export function ReaderToc<TItem extends ReaderTocItem>({
    isOpen,
    onClose,
    tocItems,
    getChildren,
    onNavigate,
    isNavigationDisabled = false,
    colors,
    title = "Table of Contents",
}: ReaderTocProps<TItem>) {
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
                        {title}
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
                                key={`${link.id}-${index}`}
                                item={link}
                                depth={0}
                                getChildren={getChildren}
                                isNavigationDisabled={isNavigationDisabled}
                                onNavigate={(item) => {
                                    onNavigate(item);
                                    onClose();
                                }}
                                colors={colors}
                            />
                        ))
                    )}
                </Box>
            </Box>
        </>
    );
}
