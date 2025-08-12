import type { BookModel } from "@/entities/book";
import {axiosInstance} from "@/shared";

export interface UpdateBookRequest {
  title?: string;
  author?: string;
  isFavorited?: boolean;
  publishedYear?: string;
}

export async function updateBook(
  id: string,
  request: UpdateBookRequest
): Promise<BookModel> {
    return await axiosInstance.put(`/books/${id}`, request)
        .then((response) => response.data);
}
