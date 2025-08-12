import type { BookModel } from "@/entities/book";
import {axiosInstance} from "@/shared";
import {axiosErrorHandler} from "@/features/authentication/api";

export async function fetchBookById(bookId: string): Promise<BookModel | null> {
      return await axiosInstance.get(`/books/${bookId}`)
          .then(response => response.data).catch(axiosErrorHandler)
}