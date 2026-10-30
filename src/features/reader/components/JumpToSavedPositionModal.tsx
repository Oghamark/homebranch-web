import {Button, Flex, Text} from "@chakra-ui/react";
import type {Locator} from "@readium/shared";
import {useAppSelector} from "@/app/hooks";
import {getReaderControlColors, ReaderDialog} from "./ReaderUI";

export type ModalCase =
    | {type: "approximate"; deviceName: string; serverPosition: Locator; serverLabel: string; localWork?: boolean}
    | {type: "portable"; deviceName: string; serverPosition: Locator; serverLabel: string; localWork?: boolean}
    | {type: "passage"; deviceName: string; serverPosition: Locator; serverLabel: string; localWork?: boolean}
    | {type: "jump"; deviceName: string; updatedAt: string; serverPosition: Locator; serverLabel: string}
    | {type: "conflict"; serverPosition: Locator; localPosition: Locator; serverLabel: string; localLabel: string};

interface JumpToSavedPositionModalProps {
    modalCase: ModalCase;
    open: boolean;
    onJump: (locator: Locator) => void;
    onKeepLocal: () => void;
    onClose: () => void;
}

export function JumpToSavedPositionModal({modalCase, open, onJump, onKeepLocal, onClose}: JumpToSavedPositionModalProps) {
    const mode = useAppSelector((state) => state.readerTheme.mode);
    const colors = getReaderControlColors(mode);
    const isConflict = modalCase.type === "conflict";
    const quietButton = {bg: "transparent", color: colors.text, borderColor: colors.uiBorder, _hover: {bg: colors.hoverBg}};

    return <ReaderDialog open={open} onClose={onClose} colors={colors}
        title={isConflict ? "Choose your reading position" : "Continue from your saved position?"}
        footer={<>
            <Button {...quietButton} variant="outline" onClick={isConflict ? onKeepLocal : onClose}>
                {isConflict ? "Keep this device's position" : "Stay here"}
            </Button>
            <Button bg={colors.text} color={colors.uiBg} _hover={{opacity: 0.9}}
                onClick={() => onJump(modalCase.serverPosition)}>{modalCase.type === "approximate" ? "Jump to approximate percent" : "Use saved position"}</Button>
        </>}>
        {modalCase.type === "approximate" || modalCase.type === "portable" || modalCase.type === "passage" ? <>
            <Text>KOReader on <strong>{modalCase.deviceName}</strong> has a newer reading position.</Text>
            <Text mt={3}>{modalCase.serverLabel}. {modalCase.type === "passage" ? "The saved text passage was verified in this edition. Page layout can differ between devices." : modalCase.type === "portable" ? "The target section is verified; placement within it is approximate. The selected passage remains your reading point even when other sections share its page." : "This is an approximate whole-book jump, not an exact native pointer."}</Text>
            {modalCase.localWork && <Text mt={3}>This device also has unsent reading progress. Staying here preserves it; using the saved position replaces it.</Text>}
        </> : modalCase.type === "jump" ? <>
            <Text>You were reading on <strong>{modalCase.deviceName}</strong> on {new Date(modalCase.updatedAt).toLocaleDateString(undefined, {
                month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
            })}.</Text>
            <Text mt={3} fontWeight="medium">{modalCase.serverLabel}</Text>
        </> : <>
            <Text mb={4}>Your saved position and this device's position are different. Choose where to continue.</Text>
            <Flex gap={4} wrap="wrap">
                <Flex direction="column" p={4} borderWidth="1px" borderColor={colors.uiBorder} borderRadius="lg" flex={1} minW="120px">
                    <Text fontWeight="semibold">Saved position</Text><Text mt={2} fontSize="sm">{modalCase.serverLabel}</Text>
                </Flex>
                <Flex direction="column" p={4} borderWidth="1px" borderColor={colors.uiBorder} borderRadius="lg" flex={1} minW="120px">
                    <Text fontWeight="semibold">This device</Text><Text mt={2} fontSize="sm">{modalCase.localLabel}</Text>
                </Flex>
            </Flex>
        </>}
    </ReaderDialog>;
}
