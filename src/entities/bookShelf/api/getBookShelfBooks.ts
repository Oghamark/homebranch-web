import {axiosInstance, type Result} from "@/shared";
import {axiosErrorHandler} from "@/features/authentication/api";
import type {BookModel} from "@/entities/book";
import type {PaginationResult} from "@/shared/api/api_response";

export async function getBookShelfBooks(bookShelfId: string, limit: number = 50, offset: number = 0) {
    const result = await axiosInstance
        .get<Result<PaginationResult<BookModel[]>>>(`/book-shelves/${bookShelfId}/books?limit=${limit}&offset=${offset}`)
        .then((response) => response.data)
        .catch(axiosErrorHandler);

    if (result?.success) {
        return result.value ?? null;
    }
    return null;
}