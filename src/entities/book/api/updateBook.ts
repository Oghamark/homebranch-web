import type { BookModel } from "@/entities/book";
import {axiosInstance, type Result} from "@/shared";
import {axiosErrorHandler} from "@/features/authentication/api";

export interface UpdateBookRequest {
  title?: string;
  author?: string;
  isFavorite?: boolean;
  publishedYear?: string;
}

export async function updateBook(
  id: string,
  request: UpdateBookRequest
): Promise<BookModel | null> {
    return await axiosInstance.put<Result<BookModel>>(`/books/${id}`, request)
        .then((response) => response.data.value)
        .catch(axiosErrorHandler) ?? null;
}
