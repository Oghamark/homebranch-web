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
            aria-label={isGrid ? "Switch to list view" : "Switch to grid view"}
            onClick={() => onDisplayModeChange(isGrid ? "table" : "grid")}
        >
            {isGrid ? <LuList/> : <LuLayoutGrid/>}
        </IconButton>
    );
}
