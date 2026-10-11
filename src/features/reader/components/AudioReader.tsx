import {useCallback, useEffect, useRef, useState} from "react";
import {Box, Heading, Stack, Text} from "@chakra-ui/react";
import type {BookModel, BookFormatType} from "@/entities/book";
import {config} from "@/shared";
import {getSavedPosition, savePosition} from "../api/savedPositionApi";
import {useDeviceName} from "../hooks/useDeviceName";

interface AudioReaderProps {
    book: BookModel;
    format: BookFormatType;
}

interface AudioPosition {
    type: "audio";
    time: number;
}

function parseAudioPosition(position: string): AudioPosition | null {
    try {
        const parsed: unknown = JSON.parse(position);
        if (
            typeof parsed === "object" &&
            parsed !== null &&
            "type" in parsed &&
            parsed.type === "audio" &&
            "time" in parsed &&
            typeof parsed.time === "number" &&
            Number.isFinite(parsed.time)
        ) {
            return {type: "audio", time: Math.max(0, parsed.time)};
        }
    } catch {
        return null;
    }
    return null;
}

export function AudioReader({book, format}: AudioReaderProps) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const lastSavedAtRef = useRef(0);
    const hasRestoredPositionRef = useRef(false);
    const deviceName = useDeviceName();
    const [error, setError] = useState<string | null>(null);
    const pendingSeekRef = useRef<number | null>(null);
    const source = `${config.apiUrl}/books/${book.id}/download?format=${format}&inline=true`;

    useEffect(() => {
        let cancelled = false;
        getSavedPosition(book.id)
            .then((position) => {
                if (cancelled || !position) return;
                const audioPosition = parseAudioPosition(position.position);
                if (audioPosition && audioRef.current) {
                    if (audioRef.current.readyState >= HTMLMediaElement.HAVE_METADATA) {
                        audioRef.current.currentTime = audioPosition.time;
                    } else {
                        pendingSeekRef.current = audioPosition.time;
                    }
                }
            })
            .catch(() => {
                if (!cancelled) setError("Could not restore the saved listening position.");
            })
            .finally(() => {
                hasRestoredPositionRef.current = true;
            });
        return () => {
            cancelled = true;
        };
    }, [book.id]);

    const saveCurrentPosition = useCallback(async () => {
        const audio = audioRef.current;
        if (!audio || !Number.isFinite(audio.duration) || audio.duration <= 0) return;
        try {
            await savePosition(book.id, {
                position: JSON.stringify({type: "audio", time: audio.currentTime}),
                deviceName,
                percentage: audio.currentTime / audio.duration,
            });
        } catch {
            setError("Listening position could not be synced.");
        }
    }, [book.id, deviceName]);

    const handleTimeUpdate = () => {
        const audio = audioRef.current;
        if (!audio || !hasRestoredPositionRef.current) return;
        const now = Date.now();
        if (now - lastSavedAtRef.current < 10_000) return;
        lastSavedAtRef.current = now;
        void saveCurrentPosition();
    };

    return (
        <Box
            position="fixed"
            inset={0}
            zIndex={1000}
            display="flex"
            alignItems="center"
            justifyContent="center"
            bg="bg.canvas"
            p={6}
        >
            <Stack w="full" maxW="xl" gap={5} textAlign="center">
                <Heading size="xl">{book.title}</Heading>
                <Text color="fg.muted">{book.author}</Text>
                <audio
                    ref={audioRef}
                    controls
                    preload="metadata"
                    crossOrigin="use-credentials"
                    src={source}
                    onLoadedMetadata={() => {
                        if (pendingSeekRef.current !== null && audioRef.current) {
                            audioRef.current.currentTime = pendingSeekRef.current;
                            pendingSeekRef.current = null;
                        }
                    }}
                    onTimeUpdate={handleTimeUpdate}
                    onPause={() => void saveCurrentPosition()}
                    onEnded={() => void saveCurrentPosition()}
                    onError={() => setError("The audiobook could not be played.")}
                    style={{width: "100%"}}
                />
                {error && <Text color="fg.error" role="status">{error}</Text>}
            </Stack>
        </Box>
    );
}
