import type {BookModel} from "@/entities/book";
import {axiosInstance} from "@/shared";
import {axiosErrorHandler} from "@/features/authentication/api";

export async function fetchBooks(): Promise<BookModel[]> {
    return await axiosInstance.get<BookModel[]>('/books')
        .then((response) => response.data).catch(axiosErrorHandler) ?? [];
}