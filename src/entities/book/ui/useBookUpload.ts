import { useState } from "react";
import {
  type CreateBookRequest,
  useCreateAudiobookMutation,
  useCreateBookMutation,
  usePreviewAudiobookMutation,
} from "@/entities/book";
import {
  isFetchBaseQueryError,
  isErrorWithMessage,
} from "@/shared/api/rtk-query";
import { toaster } from "@/shared/ui/toaster";

export type FileUploadStatus = {
  name: string;
  status: "pending" | "uploading" | "success" | "skipped" | "failed";
  error?: string;
};

function getErrorMessage(error: unknown): string {
  if (isFetchBaseQueryError(error)) {
    return typeof error.data === "string"
      ? error.data
      : JSON.stringify(error.data);
  }
  if (isErrorWithMessage(error)) {
    return error.message;
  }
  return "Unknown error";
}

export function useBookUpload() {
  const [createBook] = useCreateBookMutation();
  const [createAudiobook] = useCreateAudiobookMutation();
  const [previewAudiobook] = usePreviewAudiobookMutation();
  const [uploadStatuses, setUploadStatuses] = useState<FileUploadStatus[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const processFiles = async (
    files: File[],
    metadata: Array<{ title?: string; author?: string } | undefined> = []
  ) => {
    if (!files || files.length === 0) return;

    const initialStatuses: FileUploadStatus[] = files.map((f) => ({
      name: f.name,
      status: "pending",
    }));
    setUploadStatuses(initialStatuses);
    setIsDialogOpen(true);
    setIsUploading(true);

    let successCount = 0;
    let failedCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      setUploadStatuses((prev) =>
        prev.map((s, idx) => (idx === i ? { ...s, status: "uploading" } : s))
      );

      try {
        const createBookRequest: CreateBookRequest = {
          file,
          title: metadata[i]?.title,
          author: metadata[i]?.author,
          isFavorite: false,
        };

        const result = await createBook(createBookRequest).unwrap();
        const wasSkipped = "skipped" in result && result.skipped === true;
        setUploadStatuses((prev) =>
          prev.map((s, idx) =>
            idx === i ? { ...s, status: wasSkipped ? "skipped" : "success" } : s
          )
        );
        if (!wasSkipped) successCount++;
      } catch (e) {
        setUploadStatuses((prev) =>
          prev.map((s, idx) =>
            idx === i
              ? { ...s, status: "failed", error: getErrorMessage(e) }
              : s
          )
        );
        failedCount++;
      }
    }

    setIsUploading(false);

    if (failedCount === 0 && successCount > 0) {
      toaster.create({
        title: `${successCount} book${
          successCount > 1 ? "s" : ""
        } added successfully!`,
        type: "success",
      });
    }
  };

  const processAudiobooks = async (
    audiobooks: Array<{ title: string; author?: string; files: File[] }>
  ) => {
    if (audiobooks.length === 0) return;
    setUploadStatuses(
      audiobooks.map(({ title }) => ({ name: title, status: "pending" }))
    );
    setIsDialogOpen(true);
    setIsUploading(true);
    let successCount = 0;
    let failedCount = 0;

    for (let i = 0; i < audiobooks.length; i++) {
      const audiobook = audiobooks[i];
      setUploadStatuses((prev) =>
        prev.map((status, index) =>
          index === i ? { ...status, status: "uploading" } : status
        )
      );
      try {
        await createAudiobook({
          files: audiobook.files,
          title: audiobook.title,
          author: audiobook.author,
        }).unwrap();
        setUploadStatuses((prev) =>
          prev.map((status, index) =>
            index === i ? { ...status, status: "success" } : status
          )
        );
        successCount++;
      } catch (error) {
        setUploadStatuses((prev) =>
          prev.map((status, index) =>
            index === i
              ? { ...status, status: "failed", error: getErrorMessage(error) }
              : status
          )
        );
        failedCount++;
      }
    }

    setIsUploading(false);
    if (failedCount === 0 && successCount > 0) {
      toaster.create({
        title: `${successCount} audiobook${
          successCount > 1 ? "s" : ""
        } added successfully!`,
        type: "success",
      });
    }
  };

  return {
    uploadStatuses,
    isDialogOpen,
    isUploading,
    processFiles,
    processAudiobooks,
    previewAudiobook: (files: File[], relativePaths: string[]) =>
      previewAudiobook({ files, relativePaths }).unwrap(),
    closeDialog: () => setIsDialogOpen(false),
  };
}
