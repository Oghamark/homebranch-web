import {useCallback, useEffect, useRef, useState} from "react";
import {Box, Button, Heading, Stack, Text} from "@chakra-ui/react";
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
    track?: number;
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
            const track = "track" in parsed && typeof parsed.track === "number" && Number.isInteger(parsed.track)
                ? Math.max(0, parsed.track)
                : 0;
            return {type: "audio", track, time: Math.max(0, parsed.time)};
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
    const pendingTrackRef = useRef<number | null>(null);
    const resumePlaybackRef = useRef(false);
    const trackSwitchPendingRef = useRef(false);
    const tracks = format === "MP3" ? book.formats?.find(item => item.format === "MP3")?.audioTracks ?? [] : [];
    const trackCount = Math.max(1, tracks.length);
    const [currentTrack, setCurrentTrack] = useState(0);
    const trackQuery = format === "MP3" ? `&track=${currentTrack}` : "";
    const source = `${config.apiUrl}/books/${book.id}/download?format=${format}${trackQuery}&inline=true`;

    useEffect(() => {
        if (resumePlaybackRef.current && audioRef.current) {
            resumePlaybackRef.current = false;
            void audioRef.current.play().catch(() => setError("The next audiobook track could not be played."));
        }
    }, [currentTrack]);

    useEffect(() => {
        let cancelled = false;
        getSavedPosition(book.id)
            .then((position) => {
                if (cancelled || !position) return;
                const audioPosition = parseAudioPosition(position.position);
                if (audioPosition) {
                    const track = Math.min(audioPosition.track ?? 0, trackCount - 1);
                    setCurrentTrack(track);
                    pendingSeekRef.current = audioPosition.time;
                    pendingTrackRef.current = track;
                }
                if (audioPosition && audioRef.current && audioRef.current.readyState >= HTMLMediaElement.HAVE_METADATA) {
                    const track = Math.min(audioPosition.track ?? 0, trackCount - 1);
                    if (track === currentTrack) {
                        audioRef.current.currentTime = audioPosition.time;
                        pendingSeekRef.current = null;
                        pendingTrackRef.current = null;
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
    }, [book.id, trackCount]);

    const saveCurrentPosition = useCallback(async () => {
        const audio = audioRef.current;
        if (!audio || !Number.isFinite(audio.duration) || audio.duration <= 0) return;
        try {
            await savePosition(book.id, {
                position: JSON.stringify({type: "audio", track: currentTrack, time: audio.currentTime}),
                deviceName,
                percentage: Math.min(0.999, (currentTrack + audio.currentTime / audio.duration) / trackCount),
            });
        } catch {
            setError("Listening position could not be synced.");
        }
    }, [book.id, currentTrack, deviceName, trackCount]);

    const handleTimeUpdate = () => {
        const audio = audioRef.current;
        if (!audio || !hasRestoredPositionRef.current) return;
        const now = Date.now();
        if (now - lastSavedAtRef.current < 10_000) return;
        lastSavedAtRef.current = now;
        void saveCurrentPosition();
    };

    const selectTrack = (track: number) => {
        if (track < 0 || track >= trackCount || track === currentTrack) return;
        void saveCurrentPosition();
        trackSwitchPendingRef.current = true;
        resumePlaybackRef.current = audioRef.current !== null && !audioRef.current.paused;
        setCurrentTrack(track);
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
                {tracks.length > 1 && (
                    <Text color="fg.muted">
                        Track {currentTrack + 1} of {tracks.length}: {tracks[currentTrack]?.title}
                    </Text>
                )}
                <Stack direction="row" justify="center">
                    <Button
                        size="sm"
                        variant="outline"
                        disabled={currentTrack === 0}
                        onClick={() => selectTrack(currentTrack - 1)}
                    >
                        Previous track
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        disabled={currentTrack >= trackCount - 1}
                        onClick={() => selectTrack(currentTrack + 1)}
                    >
                        Next track
                    </Button>
                </Stack>
                <audio
                    ref={audioRef}
                    controls
                    preload="metadata"
                    crossOrigin="use-credentials"
                    src={source}
                    onLoadedMetadata={() => {
                        trackSwitchPendingRef.current = false;
                        if (
                            pendingSeekRef.current !== null &&
                            pendingTrackRef.current === currentTrack &&
                            audioRef.current
                        ) {
                            audioRef.current.currentTime = pendingSeekRef.current;
                            pendingSeekRef.current = null;
                            pendingTrackRef.current = null;
                        }
                    }}
                    onTimeUpdate={handleTimeUpdate}
                    onPause={() => {
                        if (!trackSwitchPendingRef.current) void saveCurrentPosition();
                    }}
                    onEnded={() => {
                        void saveCurrentPosition();
                        if (currentTrack + 1 < trackCount) {
                            resumePlaybackRef.current = true;
                            trackSwitchPendingRef.current = true;
                            setCurrentTrack(currentTrack + 1);
                        }
                    }}
                    onError={() => {
                        trackSwitchPendingRef.current = false;
                        setError("The audiobook could not be played.");
                    }}
                    style={{width: "100%"}}
                />
                {error && <Text color="fg.error" role="status">{error}</Text>}
            </Stack>
        </Box>
    );
}
