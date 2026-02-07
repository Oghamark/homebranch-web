import type {BookModel} from "@/entities/book";

export type CreateBookRequest = Omit<BookModel, "id" | "fileName" | "coverImageFileName"> & { file: File, coverImage: Blob | undefined };