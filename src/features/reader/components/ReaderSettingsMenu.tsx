import { Box, Flex, Text, Button, IconButton } from "@chakra-ui/react";
import { useAppDispatch, useAppSelector } from "@/app/hooks";
import { setThemeMode, setFontFamily, setFontSize } from "../store/readerThemeSlice";
import { type ThemeColorMode, getThemeColors } from "../types/ReaderTheme";
import { LuSettings, LuMinus, LuPlus } from "react-icons/lu";
import { useCallback, useEffect, useRef, useState } from "react";

const FONT_OPTIONS = [
    { value: "System Default", label: "System Default" },
    { value: "serif", label: "Serif" },
    { value: "sans-serif", label: "Sans-serif" },
    { value: "monospace", label: "Monospace" },
];

const THEME_OPTIONS: { value: ThemeColorMode; label: string }[] = [
    { value: "light", label: "Light" },
    { value: "dark", label: "Dark" },
    { value: "sepia", label: "Sepia" },
];

export function ReaderSettingsMenu() {
    const dispatch = useAppDispatch();
    const { mode, fontFamily, fontSize } = useAppSelector((state) => state.readerTheme);
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const close = useCallback(() => setIsOpen(false), []);

    useEffect(() => {
        if (!isOpen) return;

        function handleClick(e: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                close();
            }
        }

        document.addEventListener("pointerdown", handleClick);
        return () => document.removeEventListener("pointerdown", handleClick);
    }, [isOpen, close]);

    useEffect(() => {
        if (!isOpen) return;

        function handleKey(e: KeyboardEvent) {
            if (e.key === "Escape") close();
        }

        document.addEventListener("keydown", handleKey);
        return () => document.removeEventListener("keydown", handleKey);
    }, [isOpen, close]);

    const handleSizeIncrement = () => dispatch(setFontSize(Math.min(fontSize + 10, 300)));
    const handleSizeDecrement = () => dispatch(setFontSize(Math.max(fontSize - 10, 50)));

    const colors = getThemeColors(mode);

    return (
        <Box ref={menuRef} position="fixed" top={2} right={12} zIndex={1002}>
            <IconButton
                aria-label="Reader Settings"
                borderRadius="full"
                size="sm"
                bg={colors.btnBg}
                color={colors.text}
                boxShadow="md"
                _hover={{ bg: colors.btnHoverBg }}
                onClick={() => setIsOpen((prev) => !prev)}
            >
                <LuSettings />
            </IconButton>

            {isOpen && (
                <Box
                    position="absolute"
                    top="100%"
                    right={0}
                    mt={2}
                    p={4}
                    bg={colors.uiBg}
                    color={colors.text}
                    boxShadow="lg"
                    borderRadius="md"
                    minW="240px"
                    border="1px solid"
                    borderColor={colors.uiBorder}
                >
                    <Flex direction="column" gap={4}>
                        {/* Theme mode */}
                        <Box>
                            <Text fontSize="xs" fontWeight="semibold" textTransform="uppercase" letterSpacing="wide" mb={2} opacity={0.7}>
                                Theme
                            </Text>
                            <Flex gap={2}>
                                {THEME_OPTIONS.map(({ value, label }) => (
                                    <Button
                                        key={value}
                                        size="sm"
                                        flex={1}
                                        onClick={() => dispatch(setThemeMode(value))}
                                        bg={mode === value ? colors.activeBg : "transparent"}
                                        color={colors.text}
                                        border="1px solid"
                                        borderColor={mode === value ? colors.text : colors.uiBorder}
                                        fontWeight={mode === value ? "semibold" : "normal"}
                                        _hover={{ bg: mode === value ? colors.activeBg : colors.hoverBg }}
                                    >
                                        {label}
                                    </Button>
                                ))}
                            </Flex>
                        </Box>

                        {/* Font family */}
                        <Box>
                            <Text fontSize="xs" fontWeight="semibold" textTransform="uppercase" letterSpacing="wide" mb={2} opacity={0.7}>
                                Font
                            </Text>
                            <Flex direction="column" gap={1}>
                                {FONT_OPTIONS.map(({ value, label }) => (
                                    <Button
                                        key={value}
                                        size="sm"
                                        variant="ghost"
                                        justifyContent="flex-start"
                                        onClick={() => dispatch(setFontFamily(value))}
                                        bg={fontFamily === value ? colors.activeBg : "transparent"}
                                        color={colors.text}
                                        fontWeight={fontFamily === value ? "semibold" : "normal"}
                                        fontFamily={value === "System Default" ? "inherit" : value}
                                        _hover={{ bg: fontFamily === value ? colors.activeBg : colors.hoverBg }}
                                    >
                                        {label}
                                    </Button>
                                ))}
                            </Flex>
                        </Box>

                        {/* Font size */}
                        <Box>
                            <Text fontSize="xs" fontWeight="semibold" textTransform="uppercase" letterSpacing="wide" mb={2} opacity={0.7}>
                                Size
                            </Text>
                            <Flex gap={2} align="center">
                                <IconButton
                                    aria-label="Decrease font size"
                                    size="sm"
                                    onClick={handleSizeDecrement}
                                    disabled={fontSize <= 50}
                                    bg="transparent"
                                    color={colors.text}
                                    border="1px solid"
                                    borderColor={colors.uiBorder}
                                    _hover={{ bg: colors.hoverBg }}
                                >
                                    <LuMinus />
                                </IconButton>
                                <Text flex={1} textAlign="center" fontSize="sm" fontWeight="medium">
                                    {fontSize}%
                                </Text>
                                <IconButton
                                    aria-label="Increase font size"
                                    size="sm"
                                    onClick={handleSizeIncrement}
                                    disabled={fontSize >= 300}
                                    bg="transparent"
                                    color={colors.text}
                                    border="1px solid"
                                    borderColor={colors.uiBorder}
                                    _hover={{ bg: colors.hoverBg }}
                                >
                                    <LuPlus />
                                </IconButton>
                            </Flex>
                        </Box>
                    </Flex>
                </Box>
            )}
        </Box>
    );
}
