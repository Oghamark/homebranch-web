import { Box, Button, Text } from "@chakra-ui/react";
import type { ThemeColors } from "../types/ReaderTheme";
import {ReaderDialog} from "./ReaderUI";

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
            <Button
                variant="ghost"
                h="auto"
                minH="44px"
                justifyContent="flex-start"
                whiteSpace="normal"
                w="100%"
                textAlign="left"
                px={3}
                py={2}
                pl={`${12 + depth * 16}px`}
                fontSize="sm"
                color={colors.text}
                borderRadius="md"
                disabled={isNavigationDisabled}
                opacity={isNavigationDisabled ? 0.6 : 1}
                cursor={isNavigationDisabled ? "not-allowed" : "pointer"}
                _hover={isNavigationDisabled ? undefined : { bg: colors.hoverBg }}
                onClick={handleClick}
            >
                {item.label}
            </Button>
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
    return (
        <ReaderDialog open={isOpen} onClose={onClose} title={title} colors={colors}>
                <Box as="nav" aria-label={title} py={2}>
                    {tocItems.length === 0 ? (
                        <Text px={4} py={3} fontSize="sm" color={colors.muted}>
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
        </ReaderDialog>
    );
}
