import {Button, ButtonGroup, Flex, IconButton} from "@chakra-ui/react";
import {LuLayoutGrid, LuList} from "react-icons/lu";
import type {LibraryDisplayMode} from "@/features/library/store/librarySlice";

interface LibraryDisplayOptionsProps {
    displayMode: LibraryDisplayMode;
    onDisplayModeChange: (mode: LibraryDisplayMode) => void;
}

export function LibraryDisplayOptions({
    displayMode,
    onDisplayModeChange
}: LibraryDisplayOptionsProps) {
    return (
        <Flex align="center" gap={2} wrap="wrap">
            <ButtonGroup size="sm" variant="outline" aria-label="Collection display">
                <Button
                    variant={displayMode === "grid" ? "solid" : "outline"}
                    aria-pressed={displayMode === "grid"}
                    minH="44px"
                    onClick={() => onDisplayModeChange("grid")}
                >
                    Grid
                </Button>
                <Button
                    variant={displayMode === "table" ? "solid" : "outline"}
                    aria-pressed={displayMode === "table"}
                    minH="44px"
                    onClick={() => onDisplayModeChange("table")}
                >
                    List
                </Button>
            </ButtonGroup>
        </Flex>
    );
}

interface LibraryDisplayToggleButtonProps {
    displayMode: LibraryDisplayMode;
    onDisplayModeChange: (mode: LibraryDisplayMode) => void;
}

export function LibraryDisplayToggleButton({
    displayMode,
    onDisplayModeChange
}: LibraryDisplayToggleButtonProps) {
    const isGrid = displayMode === "grid";

    return (
        <IconButton
            variant="ghost"
            size="sm"
            minH="44px"
            minW="44px"
            aria-label={isGrid ? "Switch to list view" : "Switch to grid view"}
            onClick={() => onDisplayModeChange(isGrid ? "table" : "grid")}
        >
            {isGrid ? <LuList/> : <LuLayoutGrid/>}
        </IconButton>
    );
}
