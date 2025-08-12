import type { BookModel } from "@/entities/book";
import {axiosInstance} from "@/shared";
import {axiosErrorHandler} from "@/features/authentication/api";

export async function fetchFavoritedBooks(): Promise<BookModel[]> {
    return await axiosInstance.get(`/books/favorited`)
        .then((response) => response.data).catch(axiosErrorHandler);
}
