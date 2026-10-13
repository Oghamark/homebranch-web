import { useCallback, useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  Flex,
  Grid,
  Heading,
  HStack,
  IconButton,
  Image,
  Stack,
  Text,
} from "@chakra-ui/react";
import {
  LuArrowLeft,
  LuAudioLines,
  LuFastForward,
  LuPause,
  LuPlay,
  LuRewind,
  LuSkipBack,
  LuSkipForward,
} from "react-icons/lu";
import { Link } from "react-router";
import type { BookModel, BookFormatType } from "@/entities/book";
import { config } from "@/shared";
import { getSavedPosition, savePosition } from "../api/savedPositionApi";
import { useDeviceName } from "../hooks/useDeviceName";

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
      const track =
        "track" in parsed &&
        typeof parsed.track === "number" &&
        Number.isInteger(parsed.track)
          ? Math.max(0, parsed.track)
          : 0;
      return { type: "audio", track, time: Math.max(0, parsed.time) };
    }
  } catch {
    return null;
  }
  return null;
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const totalSeconds = Math.floor(seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainingSeconds = totalSeconds % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(
        remainingSeconds
      ).padStart(2, "0")}`
    : `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

export function AudioReader({ book, format }: AudioReaderProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const lastSavedAtRef = useRef(0);
  const hasRestoredPositionRef = useRef(false);
  const deviceName = useDeviceName();
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const pendingSeekRef = useRef<number | null>(null);
  const pendingTrackRef = useRef<number | null>(null);
  const resumePlaybackRef = useRef(false);
  const trackSwitchPendingRef = useRef(false);
  const tracks =
    format === "MP3"
      ? book.formats?.find((item) => item.format === "MP3")?.audioTracks ?? []
      : [];
  const trackCount = Math.max(1, tracks.length);
  const [currentTrack, setCurrentTrack] = useState(0);
  const trackQuery = format === "MP3" ? `&track=${currentTrack}` : "";
  const source = `${config.apiUrl}/books/${book.id}/download?format=${format}${trackQuery}&inline=true`;
  const currentTrackTitle = tracks[currentTrack]?.title ?? book.title;
  const progress =
    duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  useEffect(() => {
    if (resumePlaybackRef.current && audioRef.current) {
      resumePlaybackRef.current = false;
      void audioRef.current
        .play()
        .catch(() => setError("The next audiobook track could not be played."));
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
        if (
          audioPosition &&
          audioRef.current &&
          audioRef.current.readyState >= HTMLMediaElement.HAVE_METADATA
        ) {
          const track = Math.min(audioPosition.track ?? 0, trackCount - 1);
          if (track === currentTrack) {
            audioRef.current.currentTime = audioPosition.time;
            pendingSeekRef.current = null;
            pendingTrackRef.current = null;
          }
        }
      })
      .catch(() => {
        if (!cancelled)
          setError("Could not restore the saved listening position.");
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
    if (!audio || !Number.isFinite(audio.duration) || audio.duration <= 0)
      return;
    try {
      await savePosition(book.id, {
        position: JSON.stringify({
          type: "audio",
          track: currentTrack,
          time: audio.currentTime,
        }),
        deviceName,
        percentage: Math.min(
          0.999,
          (currentTrack + audio.currentTime / audio.duration) / trackCount
        ),
      });
    } catch {
      setError("Listening position could not be synced.");
    }
  }, [book.id, currentTrack, deviceName, trackCount]);

  const handleTimeUpdate = () => {
    const audio = audioRef.current;
    if (!audio) return;
    setCurrentTime(audio.currentTime);
    if (!hasRestoredPositionRef.current) return;
    const now = Date.now();
    if (now - lastSavedAtRef.current < 10_000) return;
    lastSavedAtRef.current = now;
    void saveCurrentPosition();
  };

  const selectTrack = (track: number) => {
    if (track < 0 || track >= trackCount || track === currentTrack) return;
    void saveCurrentPosition();
    setCurrentTime(0);
    setDuration(0);
    trackSwitchPendingRef.current = true;
    resumePlaybackRef.current =
      audioRef.current !== null && !audioRef.current.paused;
    setCurrentTrack(track);
  };

  const seekBy = (seconds: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(
      0,
      Math.min(duration, audioRef.current.currentTime + seconds)
    );
    setCurrentTime(audioRef.current.currentTime);
  };

  const togglePlayback = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      void audio
        .play()
        .catch(() => setError("The audiobook could not be played."));
    } else {
      audio.pause();
    }
  };

  return (
    <Box
      minH="100dvh"
      bg="bg.canvas"
      px={{ base: 4, md: 8 }}
      py={{ base: 4, md: 8 }}
    >
      <Stack maxW="6xl" mx="auto" gap={{ base: 8, md: 12 }}>
        <Flex align="center" justify="space-between">
          <Button
            variant="ghost"
            size="sm"
            gap={2}
            px={2}
            color="fg.muted"
            _hover={{ color: "fg", bg: "bg.muted" }}
            asChild
          >
            <Link to={`/books/${book.id}`}>
              <LuArrowLeft />
              Back to book
            </Link>
          </Button>
          <Text
            display={{ base: "none", sm: "block" }}
            color="fg.subtle"
            fontSize="xs"
            fontWeight="medium"
            letterSpacing="0.12em"
            textTransform="uppercase"
          >
            Now listening
          </Text>
        </Flex>

        <Grid
          templateColumns={{ base: "1fr", md: "minmax(0, 1fr) minmax(0, 1fr)" }}
          alignItems="center"
          gap={{ base: 8, md: 12, lg: 16 }}
        >
          <Box
            w="full"
            maxW={{ base: "min(78vw, 360px)", md: "min(38vw, 440px)" }}
            mx="auto"
            aspectRatio="1"
            overflow="hidden"
            borderRadius="2xl"
            bg="bg.muted"
            boxShadow="0 24px 80px rgba(0, 0, 0, 0.14)"
          >
            {book.coverImageFileName ? (
              <Image
                src={`${config.apiUrl}/uploads/cover-images/${book.coverImageFileName}`}
                alt={`Cover of ${book.title}`}
                w="full"
                h="full"
                objectFit="cover"
              />
            ) : (
              <Flex
                w="full"
                h="full"
                direction="column"
                align="center"
                justify="center"
                gap={4}
                color="fg.subtle"
              >
                <LuAudioLines size={56} strokeWidth={1} />
                <Text fontSize="sm" letterSpacing="wide">
                  {format === "MP3" ? "AUDIOBOOK" : "AUDIO"}
                </Text>
              </Flex>
            )}
          </Box>

          <Stack gap={{ base: 6, md: 8 }} minW={0} w="full">
            <Stack gap={2} textAlign={{ base: "center", md: "left" }}>
              <Text
                color="fg.subtle"
                fontSize="xs"
                fontWeight="medium"
                letterSpacing="0.12em"
                textTransform="uppercase"
              >
                {tracks.length > 1
                  ? `Track ${currentTrack + 1} of ${tracks.length}`
                  : "Audiobook"}
              </Text>
              <Heading
                size={{ base: "xl", md: "2xl" }}
                lineHeight="1.15"
                textWrap="balance"
              >
                {book.title}
              </Heading>
              <Text color="fg.muted" fontSize={{ base: "md", md: "lg" }}>
                {book.author || "Unknown Author"}
              </Text>
              {tracks.length > 1 && (
                <Text color="fg.subtle" fontSize="sm" pt={2} truncate>
                  {currentTrackTitle}
                </Text>
              )}
            </Stack>

            <Stack gap={3}>
              <input
                aria-label="Playback position"
                type="range"
                min={0}
                max={duration || 0}
                step={1}
                value={Math.min(currentTime, duration || 0)}
                disabled={!duration}
                onChange={(event) => {
                  const nextTime = Number(event.target.value);
                  if (audioRef.current) audioRef.current.currentTime = nextTime;
                  setCurrentTime(nextTime);
                }}
                style={{
                  width: "100%",
                  height: 4,
                  accentColor: "#319795",
                  cursor: duration ? "pointer" : "default",
                }}
              />
              <Flex
                justify="space-between"
                color="fg.subtle"
                fontSize="xs"
                fontVariantNumeric="tabular-nums"
              >
                <Text>{formatTime(currentTime)}</Text>
                <Text>{formatTime(duration)}</Text>
              </Flex>

              <HStack justify="center" gap={{ base: 4, md: 6 }} pt={2}>
                {tracks.length > 1 && (
                  <IconButton
                    aria-label="Previous track"
                    variant="ghost"
                    size="lg"
                    color="fg.muted"
                    disabled={currentTrack === 0}
                    onClick={() => selectTrack(currentTrack - 1)}
                  >
                    <LuSkipBack />
                  </IconButton>
                )}
                <IconButton
                  aria-label="Rewind 15 seconds"
                  variant="ghost"
                  size="lg"
                  color="fg.muted"
                  onClick={() => seekBy(-15)}
                >
                  <LuRewind />
                </IconButton>
                <IconButton
                  aria-label={isPlaying ? "Pause" : "Play"}
                  size="2xl"
                  borderRadius="full"
                  colorPalette="teal"
                  boxShadow="md"
                  onClick={togglePlayback}
                >
                  {isPlaying ? <LuPause /> : <LuPlay />}
                </IconButton>
                <IconButton
                  aria-label="Forward 15 seconds"
                  variant="ghost"
                  size="lg"
                  color="fg.muted"
                  onClick={() => seekBy(15)}
                >
                  <LuFastForward />
                </IconButton>
                {tracks.length > 1 && (
                  <IconButton
                    aria-label="Next track"
                    variant="ghost"
                    size="lg"
                    color="fg.muted"
                    disabled={currentTrack >= trackCount - 1}
                    onClick={() => selectTrack(currentTrack + 1)}
                  >
                    <LuSkipForward />
                  </IconButton>
                )}
              </HStack>
            </Stack>

            {tracks.length > 1 && (
              <Stack
                gap={1}
                pt={5}
                borderTopWidth="1px"
                borderColor="border"
                maxH={{ base: "30vh", md: "26vh" }}
                overflowY="auto"
              >
                <Text
                  color="fg.subtle"
                  fontSize="xs"
                  fontWeight="medium"
                  letterSpacing="0.1em"
                  textTransform="uppercase"
                  pb={2}
                >
                  Chapters
                </Text>
                {tracks.map((track, index) => {
                  const isCurrentTrack = index === currentTrack;
                  return (
                    <Button
                      key={`${track.fileName}-${index}`}
                      variant="ghost"
                      justifyContent="flex-start"
                      h="auto"
                      minH="44px"
                      px={3}
                      py={2}
                      color={isCurrentTrack ? "teal.fg" : "fg.muted"}
                      bg={isCurrentTrack ? "teal.subtle" : "transparent"}
                      _hover={{
                        bg: isCurrentTrack ? "teal.subtle" : "bg.muted",
                      }}
                      onClick={() => selectTrack(index)}
                    >
                      <Text
                        w="2.5em"
                        flexShrink={0}
                        textAlign="left"
                        fontSize="xs"
                        fontVariantNumeric="tabular-nums"
                      >
                        {String(index + 1).padStart(2, "0")}
                      </Text>
                      <Text flex={1} textAlign="left" truncate fontSize="sm">
                        {track.title}
                      </Text>
                      {isCurrentTrack && isPlaying && (
                        <LuAudioLines size={16} />
                      )}
                    </Button>
                  );
                })}
              </Stack>
            )}
          </Stack>
        </Grid>

        {error && (
          <Text color="fg.error" fontSize="sm" role="status" textAlign="center">
            {error}
          </Text>
        )}
      </Stack>

      <audio
        ref={audioRef}
        aria-hidden="true"
        preload="metadata"
        crossOrigin="use-credentials"
        src={source}
        onPlay={() => setIsPlaying(true)}
        onPause={() => {
          setIsPlaying(false);
          if (!trackSwitchPendingRef.current) void saveCurrentPosition();
        }}
        onLoadedMetadata={() => {
          const audio = audioRef.current;
          if (!audio) return;
          setDuration(audio.duration);
          trackSwitchPendingRef.current = false;
          if (
            pendingSeekRef.current !== null &&
            pendingTrackRef.current === currentTrack
          ) {
            audio.currentTime = pendingSeekRef.current;
            setCurrentTime(pendingSeekRef.current);
            pendingSeekRef.current = null;
            pendingTrackRef.current = null;
          } else {
            setCurrentTime(audio.currentTime);
          }
        }}
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => {
          void saveCurrentPosition();
          if (currentTrack + 1 < trackCount) {
            resumePlaybackRef.current = true;
            trackSwitchPendingRef.current = true;
            setCurrentTrack(currentTrack + 1);
            setCurrentTime(0);
            setDuration(0);
          }
        }}
        onError={() => {
          trackSwitchPendingRef.current = false;
          setError("The audiobook could not be played.");
        }}
        style={{ display: "none" }}
      />
    </Box>
  );
}
