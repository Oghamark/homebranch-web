import {Button, ButtonGroup, Flex, NativeSelect, Text} from "@chakra-ui/react";
import type {LibraryDisplayMode} from "@/features/library/store/librarySlice";

interface LibraryDisplayOptionsProps {
    displayMode: LibraryDisplayMode;
    booksPerRow: number;
    onDisplayModeChange: (mode: LibraryDisplayMode) => void;
    onBooksPerRowChange: (booksPerRow: number) => void;
}

export function LibraryDisplayOptions({
    displayMode,
    booksPerRow,
    onDisplayModeChange,
    onBooksPerRowChange
}: LibraryDisplayOptionsProps) {
    return (
        <Flex align="center" gap={2} wrap="wrap">
            <ButtonGroup size="sm" variant="outline">
                <Button
                    variant={displayMode === "grid" ? "solid" : "outline"}
                    onClick={() => onDisplayModeChange("grid")}
                >
                    Grid
                </Button>
                <Button
                    variant={displayMode === "table" ? "solid" : "outline"}
                    onClick={() => onDisplayModeChange("table")}
                >
                    List
                </Button>
            </ButtonGroup>
            {displayMode === "grid" && (
                <Flex align="center" gap={2}>
                    <Text fontSize="sm" color="fg.muted" whiteSpace="nowrap">Per row</Text>
                    <NativeSelect.Root size="sm" width="84px">
                        <NativeSelect.Field
                            value={booksPerRow}
                            onChange={(e) => onBooksPerRowChange(Number(e.target.value))}
                        >
                            {[2, 3, 4, 5, 6, 7, 8].map((value) => (
                                <option key={value} value={value}>{value}</option>
                            ))}
                        </NativeSelect.Field>
                        <NativeSelect.Indicator/>
                    </NativeSelect.Root>
                </Flex>
            )}
        </Flex>
    );
}
