import {
  Button,
  CloseButton,
  Dialog,
  HStack,
  Input,
  NativeSelect,
  Portal,
  Stack,
  Text,
  type ButtonProps,
  FileUpload,
  Menu,
  useFileUploadContext,
} from "@chakra-ui/react";
import { HiPlus } from "react-icons/hi";
import { useState } from "react";
import SubmitButton from "@/shared/ui/SubmitButton";
import { toaster } from "@/shared/ui/toaster";
import type { FileAcceptDetails } from "@zag-js/file-upload";
import { useEffect, useRef } from "react";
import { UploadProgressDialog } from "./UploadProgressDialog";
import { useBookUpload } from "./useBookUpload";
export type { FileUploadStatus } from "./useBookUpload";

type AudiobookReviewTrack = {
  id: string;
  file: File;
  path: string;
  title: string;
};
type AudiobookReviewGroup = {
  id: string;
  title: string;
  author: string;
  source: "tags" | "folder" | "manual";
  tracks: AudiobookReviewTrack[];
};

function ClearFilesOnComplete({ isUploading }: { isUploading: boolean }) {
  const api = useFileUploadContext();
  const clearFilesRef = useRef(api.clearFiles);
  clearFilesRef.current = api.clearFiles;
  const prevIsUploading = useRef(false);

  useEffect(() => {
    if (prevIsUploading.current && !isUploading) {
      clearFilesRef.current();
    }
    prevIsUploading.current = isUploading;
  }, [isUploading]);

  return null;
}

export function AddBookButton(buttonProps: ButtonProps) {
  const {
    uploadStatuses,
    isDialogOpen,
    isUploading,
    processFiles,
    processAudiobooks,
    previewAudiobook,
    closeDialog,
  } = useBookUpload();
  const directoryInputRef = useRef<HTMLInputElement>(null);
  const [reviewGroups, setReviewGroups] = useState<AudiobookReviewGroup[]>([]);
  const [otherDirectoryFiles, setOtherDirectoryFiles] = useState<File[]>([]);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);

  const _handleMultiSelect = async ({ files }: FileAcceptDetails) => {
    await processFiles(files);
  };

  const _handleDirectorySelect = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const fileList = e.target.files;
    if (!fileList) return;

    const supportedFiles = Array.from(fileList).filter((f) =>
      /\.(epub|pdf|mp3|m4b)$/i.test(f.name)
    );

    if (supportedFiles.length === 0) {
      toaster.create({
        title: "No supported book files found in the selected directory.",
        type: "warning",
      });
      return;
    }

    const mp3Files = supportedFiles.filter((file) => /\.mp3$/i.test(file.name));
    const otherFiles = supportedFiles.filter(
      (file) => !/\.mp3$/i.test(file.name)
    );
    if (mp3Files.length < 2) {
      await processFiles(supportedFiles);
      e.target.value = "";
      return;
    }

    setIsPreviewing(true);
    try {
      const relativePaths = mp3Files.map(
        (file) =>
          (file as File & { webkitRelativePath?: string }).webkitRelativePath ||
          file.name
      );
      const groups = await previewAudiobook(mp3Files, relativePaths);
      setReviewGroups(
        groups.map((group, groupIndex) => ({
          id: `group-${groupIndex}`,
          title: group.title,
          author: group.author,
          source: group.source,
          tracks: group.tracks.map((track) => ({
            id: `track-${track.index}`,
            file: mp3Files[track.index],
            path: track.path,
            title: track.title,
          })),
        }))
      );
      setOtherDirectoryFiles(otherFiles);
      setIsReviewOpen(true);
    } catch (error) {
      toaster.create({
        title: `Could not inspect audiobook tracks: ${String(error)}`,
        type: "error",
      });
    } finally {
      setIsPreviewing(false);
      e.target.value = "";
    }
  };

  const moveTrackToGroup = (trackId: string, targetGroupId: string) => {
    setReviewGroups((groups) => {
      const track = groups
        .flatMap((group) => group.tracks)
        .find((item) => item.id === trackId);
      if (!track) return groups;
      if (targetGroupId === "__new__") {
        const groupId = `group-${crypto.randomUUID()}`;
        return [
          ...groups.map((group) => ({
            ...group,
            tracks: group.tracks.filter((item) => item.id !== trackId),
          })),
          {
            id: groupId,
            title: track.title,
            author: "",
            source: "manual" as const,
            tracks: [track],
          },
        ];
      }
      return groups.map((group) => ({
        ...group,
        tracks:
          group.id === targetGroupId
            ? [...group.tracks.filter((item) => item.id !== trackId), track]
            : group.tracks.filter((item) => item.id !== trackId),
      }));
    });
  };

  const splitGroup = (groupId: string) => {
    setReviewGroups((groups) =>
      groups.flatMap((group) => {
        if (group.id !== groupId) return [group];
        return group.tracks.map((track, index) => ({
          id: `${group.id}-split-${index}`,
          title: track.title,
          author: group.author,
          source: "manual" as const,
          tracks: [track],
        }));
      })
    );
  };

  const confirmAudiobookGroups = async () => {
    setIsReviewOpen(false);
    const populatedGroups = reviewGroups.filter(
      (group) => group.tracks.length > 0
    );
    const multiTrackGroups = populatedGroups.filter(
      (group) => group.tracks.length > 1
    );
    const singleTrackGroups = populatedGroups.filter(
      (group) => group.tracks.length === 1
    );
    const singleTrackFiles = singleTrackGroups.map(
      (group) => group.tracks[0].file
    );
    if (otherDirectoryFiles.length || singleTrackFiles.length) {
      await processFiles(
        [...otherDirectoryFiles, ...singleTrackFiles],
        [
          ...otherDirectoryFiles.map(() => undefined),
          ...singleTrackGroups.map((group) => ({
            title: group.title.trim() || group.tracks[0].title,
            author: group.author.trim() || undefined,
          })),
        ]
      );
    }
    await processAudiobooks(
      multiTrackGroups.map((group) => ({
        title: group.title.trim() || group.tracks[0].title,
        author: group.author.trim() || undefined,
        files: group.tracks.map((track) => track.file),
      }))
    );
    setReviewGroups([]);
    setOtherDirectoryFiles([]);
  };

  return (
    <>
      <input
        ref={directoryInputRef}
        type="file"
        // @ts-expect-error - webkitdirectory is non-standard but widely supported
        webkitdirectory="true"
        style={{ display: "none" }}
        onChange={_handleDirectorySelect}
      />

      <UploadProgressDialog
        statuses={uploadStatuses}
        isOpen={isDialogOpen}
        isUploading={isUploading}
        onClose={closeDialog}
      />

      <Dialog.Root
        open={isReviewOpen}
        onOpenChange={({ open }) => setIsReviewOpen(open)}
      >
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content maxHeight="85vh">
              <Dialog.Header>
                <Dialog.Title>Review audiobook groups</Dialog.Title>
              </Dialog.Header>
              <Dialog.Body overflowY="auto">
                <Stack gap={4}>
                  <Text fontSize="sm" color="fg.muted">
                    Tagged tracks are grouped by album and artist. Untagged
                    tracks are grouped by their containing folder. Move tracks,
                    rename books, or split a group before uploading.
                  </Text>
                  {reviewGroups.map((group) => (
                    <Stack
                      key={group.id}
                      gap={2}
                      borderWidth="1px"
                      borderRadius="md"
                      p={3}
                    >
                      <Text fontSize="xs" color="fg.muted">
                        {group.source === "tags"
                          ? "Grouped by MP3 tags"
                          : group.source === "folder"
                          ? "Grouped by folder"
                          : "Custom group"}
                      </Text>
                      <Input
                        aria-label="Audiobook title"
                        value={group.title}
                        onChange={(event) =>
                          setReviewGroups((groups) =>
                            groups.map((item) =>
                              item.id === group.id
                                ? { ...item, title: event.target.value }
                                : item
                            )
                          )
                        }
                      />
                      <Input
                        aria-label="Audiobook author"
                        placeholder="Author"
                        value={group.author}
                        onChange={(event) =>
                          setReviewGroups((groups) =>
                            groups.map((item) =>
                              item.id === group.id
                                ? { ...item, author: event.target.value }
                                : item
                            )
                          )
                        }
                      />
                      {group.tracks.map((track) => (
                        <HStack key={track.id} justify="space-between">
                          <Stack gap={0} minW={0}>
                            <Text fontSize="sm" truncate>
                              {track.title}
                            </Text>
                            <Text fontSize="xs" color="fg.muted" truncate>
                              {track.path}
                            </Text>
                          </Stack>
                          <NativeSelect.Root size="sm" width="180px">
                            <NativeSelect.Field
                              aria-label={`Group for ${track.title}`}
                              value={group.id}
                              onChange={(event) =>
                                moveTrackToGroup(track.id, event.target.value)
                              }
                            >
                              {reviewGroups.map((option) => (
                                <option key={option.id} value={option.id}>
                                  {option.title || "Untitled group"}
                                </option>
                              ))}
                              <option value="__new__">Move to new group</option>
                            </NativeSelect.Field>
                            <NativeSelect.Indicator />
                          </NativeSelect.Root>
                        </HStack>
                      ))}
                      {group.tracks.length > 1 && (
                        <Button
                          size="xs"
                          variant="outline"
                          alignSelf="flex-start"
                          onClick={() => splitGroup(group.id)}
                        >
                          Split into separate books
                        </Button>
                      )}
                    </Stack>
                  ))}
                  <Button
                    variant="outline"
                    onClick={() =>
                      setReviewGroups((groups) => [
                        ...groups,
                        {
                          id: `group-${crypto.randomUUID()}`,
                          title: "",
                          author: "",
                          source: "manual",
                          tracks: [],
                        },
                      ])
                    }
                  >
                    Add audiobook group
                  </Button>
                  {otherDirectoryFiles.length > 0 && (
                    <Text fontSize="sm" color="fg.muted">
                      {otherDirectoryFiles.length} EPUB, PDF, or M4B file(s)
                      will upload separately.
                    </Text>
                  )}
                </Stack>
              </Dialog.Body>
              <Dialog.Footer>
                <Dialog.ActionTrigger asChild>
                  <Button variant="ghost">Cancel</Button>
                </Dialog.ActionTrigger>
                <Button onClick={() => void confirmAudiobookGroups()}>
                  Upload books
                </Button>
              </Dialog.Footer>
              <Dialog.CloseTrigger asChild>
                <CloseButton />
              </Dialog.CloseTrigger>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>

      <FileUpload.Root
        accept={".epub,.pdf,.mp3,.m4b"}
        maxFiles={Number.MAX_SAFE_INTEGER}
        onFileAccept={_handleMultiSelect}
      >
        <ClearFilesOnComplete isUploading={isUploading} />
        <FileUpload.HiddenInput accept=".epub,.pdf,.mp3,.m4b" multiple />
        <Menu.Root>
          <Menu.Trigger asChild>
            <SubmitButton
              variant={"outline"}
              size="sm"
              width={"100%"}
              loading={isUploading || isPreviewing}
              {...buttonProps}
            >
              <HiPlus /> Add Book
            </SubmitButton>
          </Menu.Trigger>
          <Menu.Positioner>
            <Menu.Content>
              <FileUpload.Trigger asChild>
                <Menu.Item value="files">Select Files</Menu.Item>
              </FileUpload.Trigger>
              <Menu.Item
                value="directory"
                onClick={() => directoryInputRef.current?.click()}
              >
                Select Directory
              </Menu.Item>
            </Menu.Content>
          </Menu.Positioner>
        </Menu.Root>
      </FileUpload.Root>
    </>
  );
}
