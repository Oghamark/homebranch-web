import type { BookModel } from "@/entities/book";
import {axiosInstance, type Result} from "@/shared";
import {axiosErrorHandler} from "@/features/authentication/api";

export async function fetchFavoriteBooks(): Promise<BookModel[]> {
    return await axiosInstance.get<Result<BookModel[]>>(`/books/favorite`)
        .then((response) => response.data.value)
        .catch(axiosErrorHandler) ?? [];
}
