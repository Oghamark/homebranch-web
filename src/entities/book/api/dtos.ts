import type {BookModel} from "@/entities/book";

export type CreateBookRequest = Omit<BookModel, "id" | "fileName" | "coverImageFileName" | "uploadedByUserId"> & {
    file: File,
    coverImage: Blob | undefined
};

export interface GetBooksByIdsRequest {
    bookIds: string[];
}
