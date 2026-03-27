import { Box, Flex, Text, Button, IconButton, Separator, Switch, useMediaQuery } from "@chakra-ui/react";
import { useAppDispatch, useAppSelector } from "@/app/hooks";
import {
    setThemeMode,
    setFontFamily,
    setFontSize,
    setScroll,
    setColumnCount,
    setTextAlign,
    setLineHeight,
    setLetterSpacing,
    setWordSpacing,
    setParagraphSpacing,
    setHyphens,
    setPageGutter,
} from "../store/readerThemeSlice";
import { type TextAlignPreference, type ThemeColorMode, getThemeColors } from "../types/ReaderTheme";
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

const TEXT_ALIGN_OPTIONS: { value: TextAlignPreference; label: string }[] = [
    { value: null, label: "Default" },
    { value: "justify", label: "Justify" },
    { value: "start", label: "Start" },
    { value: "left", label: "Left" },
];

const COLUMN_OPTIONS: { value: 1 | 2 | null; label: string }[] = [
    { value: null, label: "Auto" },
    { value: 1, label: "1" },
    { value: 2, label: "2" },
];

interface RangeRowProps {
    label: string;
    value: number | null;
    min: number;
    max: number;
    step: number;
    defaultValue: number;
    format: (v: number) => string;
    onChange: (value: number | null) => void;
    colors: ReturnType<typeof getThemeColors>;
}

function RangeRow({ label, value, min, max, step, defaultValue, format, onChange, colors }: RangeRowProps) {
    const displayValue = value ?? defaultValue;

    const handleDecrement = () => {
        const next = Math.max(min, Math.round((displayValue - step) / step) * step);
        onChange(Math.abs(next - defaultValue) < step / 2 ? null : parseFloat(next.toFixed(4)));
    };

    const handleIncrement = () => {
        const next = Math.min(max, Math.round((displayValue + step) / step) * step);
        onChange(Math.abs(next - defaultValue) < step / 2 ? null : parseFloat(next.toFixed(4)));
    };

    const isAtDefault = value === null;

    return (
        <Box>
            <Flex justify="space-between" align="center" mb={1}>
                <Text fontSize="xs" fontWeight="semibold" textTransform="uppercase" letterSpacing="wide" opacity={0.7}>
                    {label}
                </Text>
                {!isAtDefault && (
                    <Button
                        size="xs"
                        variant="ghost"
                        color={colors.muted}
                        height="auto"
                        minWidth="auto"
                        px={1}
                        fontSize="xs"
                        onClick={() => onChange(null)}
                        _hover={{ bg: colors.hoverBg }}
                    >
                        Reset
                    </Button>
                )}
            </Flex>
            <Flex gap={2} align="center">
                <IconButton
                    aria-label={`Decrease ${label}`}
                    size="sm"
                    onClick={handleDecrement}
                    disabled={displayValue <= min}
                    bg="transparent"
                    color={colors.text}
                    border="1px solid"
                    borderColor={colors.uiBorder}
                    _hover={{ bg: colors.hoverBg }}
                >
                    <LuMinus />
                </IconButton>
                <Text flex={1} textAlign="center" fontSize="sm" fontWeight="medium" opacity={isAtDefault ? 0.5 : 1}>
                    {format(displayValue)}
                </Text>
                <IconButton
                    aria-label={`Increase ${label}`}
                    size="sm"
                    onClick={handleIncrement}
                    disabled={displayValue >= max}
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
    );
}

export function ReaderSettingsMenu() {
    const dispatch = useAppDispatch();
    const themeState = useAppSelector((state) => state.readerTheme);
    const { mode, fontFamily, fontSize, scroll, columnCount, textAlign, lineHeight, letterSpacing, wordSpacing, paragraphSpacing, hyphens, pageGutter } = themeState;
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const [isMobile] = useMediaQuery(["(max-width: 768px)"]);

    // Scroll mode is not supported on mobile (no swipe navigation for chapters).
    // Reset it if the user previously saved it on a larger device.
    useEffect(() => {
        if (isMobile && scroll) dispatch(setScroll(false));
    }, [isMobile, scroll, dispatch]);

    const close = useCallback(() => setIsOpen(false), []);

    useEffect(() => {
        if (!isOpen) return;
        function handleClick(e: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) close();
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

    const colors = getThemeColors(mode);

    const sectionLabel = (text: string) => (
        <Text fontSize="xs" fontWeight="semibold" textTransform="uppercase" letterSpacing="wide" mb={2} opacity={0.7}>
            {text}
        </Text>
    );

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
                    w="280px"
                    border="1px solid"
                    borderColor={colors.uiBorder}
                    maxH="80vh"
                    overflowY="auto"
                >
                    <Flex direction="column" gap={4}>

                        {/* Theme */}
                        <Box>
                            {sectionLabel("Theme")}
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

                        <Separator borderColor={colors.uiBorder} />

                        {/* Font family */}
                        <Box>
                            {sectionLabel("Font")}
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

                        <Separator borderColor={colors.uiBorder} />

                        {/* Font size */}
                        <RangeRow
                            label="Font Size"
                            value={fontSize === 100 ? null : fontSize}
                            min={50}
                            max={300}
                            step={10}
                            defaultValue={100}
                            format={(v) => `${v}%`}
                            onChange={(v) => dispatch(setFontSize(v ?? 100))}
                            colors={colors}
                        />

                        {/* Line height */}
                        <RangeRow
                            label="Line Height"
                            value={lineHeight}
                            min={1}
                            max={2}
                            step={0.1}
                            defaultValue={1.5}
                            format={(v) => v.toFixed(1)}
                            onChange={(v) => dispatch(setLineHeight(v))}
                            colors={colors}
                        />

                        {/* Letter spacing */}
                        <RangeRow
                            label="Letter Spacing"
                            value={letterSpacing}
                            min={0}
                            max={1}
                            step={0.125}
                            defaultValue={0}
                            format={(v) => v.toFixed(3)}
                            onChange={(v) => dispatch(setLetterSpacing(v))}
                            colors={colors}
                        />

                        {/* Word spacing */}
                        <RangeRow
                            label="Word Spacing"
                            value={wordSpacing}
                            min={0}
                            max={2}
                            step={0.125}
                            defaultValue={0}
                            format={(v) => v.toFixed(3)}
                            onChange={(v) => dispatch(setWordSpacing(v))}
                            colors={colors}
                        />

                        {/* Paragraph spacing */}
                        <RangeRow
                            label="Paragraph Spacing"
                            value={paragraphSpacing}
                            min={0}
                            max={3}
                            step={0.25}
                            defaultValue={0}
                            format={(v) => v.toFixed(2)}
                            onChange={(v) => dispatch(setParagraphSpacing(v))}
                            colors={colors}
                        />

                        <Separator borderColor={colors.uiBorder} />

                        {/* Text align */}
                        <Box>
                            {sectionLabel("Text Alignment")}
                            <Flex gap={2}>
                                {TEXT_ALIGN_OPTIONS.map(({ value, label }) => (
                                    <Button
                                        key={label}
                                        size="sm"
                                        flex={1}
                                        onClick={() => dispatch(setTextAlign(value))}
                                        bg={textAlign === value ? colors.activeBg : "transparent"}
                                        color={colors.text}
                                        border="1px solid"
                                        borderColor={textAlign === value ? colors.text : colors.uiBorder}
                                        fontWeight={textAlign === value ? "semibold" : "normal"}
                                        _hover={{ bg: textAlign === value ? colors.activeBg : colors.hoverBg }}
                                        fontSize="xs"
                                    >
                                        {label}
                                    </Button>
                                ))}
                            </Flex>
                        </Box>

                        <Separator borderColor={colors.uiBorder} />

                        {/* Layout */}
                        <Box>
                            {sectionLabel("Layout")}
                            <Flex direction="column" gap={3}>
                                {!isMobile && (
                                <Flex justify="space-between" align="center">
                                    <Text fontSize="sm">Scroll Mode</Text>
                                    <Switch.Root
                                        checked={scroll}
                                        onCheckedChange={({ checked }) => dispatch(setScroll(checked))}
                                        colorPalette="blue"
                                    >
                                        <Switch.HiddenInput />
                                        <Switch.Control>
                                            <Switch.Thumb />
                                        </Switch.Control>
                                    </Switch.Root>
                                </Flex>
                                )}
                                {!scroll && (
                                    <Box>
                                        <Text fontSize="xs" opacity={0.7} mb={2}>Columns</Text>
                                        <Flex gap={2}>
                                            {COLUMN_OPTIONS.map(({ value, label }) => (
                                                <Button
                                                    key={label}
                                                    size="sm"
                                                    flex={1}
                                                    onClick={() => dispatch(setColumnCount(value))}
                                                    bg={columnCount === value ? colors.activeBg : "transparent"}
                                                    color={colors.text}
                                                    border="1px solid"
                                                    borderColor={columnCount === value ? colors.text : colors.uiBorder}
                                                    fontWeight={columnCount === value ? "semibold" : "normal"}
                                                    _hover={{ bg: columnCount === value ? colors.activeBg : colors.hoverBg }}
                                                >
                                                    {label}
                                                </Button>
                                            ))}
                                        </Flex>
                                    </Box>
                                )}
                                <Flex justify="space-between" align="center">
                                    <Text fontSize="sm">Hyphens</Text>
                                    <Switch.Root
                                        checked={hyphens ?? false}
                                        onCheckedChange={({ checked }) => dispatch(setHyphens(checked))}
                                        colorPalette="blue"
                                    >
                                        <Switch.HiddenInput />
                                        <Switch.Control>
                                            <Switch.Thumb />
                                        </Switch.Control>
                                    </Switch.Root>
                                </Flex>
                            </Flex>
                        </Box>

                        <Separator borderColor={colors.uiBorder} />

                        {/* Page gutter */}
                        <RangeRow
                            label="Padding"
                            value={pageGutter === 20 ? null : pageGutter}
                            min={0}
                            max={80}
                            step={4}
                            defaultValue={20}
                            format={(v) => `${v}px`}
                            onChange={(v) => dispatch(setPageGutter(v ?? 20))}
                            colors={colors}
                        />

                    </Flex>
                </Box>
            )}
        </Box>
    );
}
