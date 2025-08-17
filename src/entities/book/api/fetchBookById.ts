import type { BookModel } from "@/entities/book";
import {axiosInstance, type Result} from "@/shared";
import {axiosErrorHandler} from "@/features/authentication/api";

export async function fetchBookById(bookId: string): Promise<BookModel | null> {
      return await axiosInstance.get<Result<BookModel>>(`/books/${bookId}`)
          .then(response => response.data.value).catch(axiosErrorHandler) ?? null
}