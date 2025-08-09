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
  try {
    return await axiosInstance.put(`/books/${id}`, request)
        .then((response) => response.data);
  } catch (error) {
    console.error("Failed to update book:", error);
    throw error; // Re-throw the error for further handling
  }
}
