import type { BookModel } from "@/entities/book";
import {axiosInstance, type Result} from "@/shared";
import {axiosErrorHandler} from "@/features/authentication/api";
import type {Params} from "react-router";

export async function fetchBookById(bookId: string, params?: Params): Promise<BookModel | null> {
      return await axiosInstance.get<Result<BookModel>>(`/books/${bookId}`, {
          params: params,
      })
          .then(response => response.data.value).catch(axiosErrorHandler) ?? null
}