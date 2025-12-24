import {axiosInstance, type Result} from "@/shared";
import {axiosErrorHandler} from "@/features/authentication/api";
import type {BookShelfModel} from "@/entities/bookShelf/model/BookShelfModel";
import type {PaginationResult} from "@/shared/api/api_response";

export async function getBookShelves() {
    const result = await axiosInstance.get<Result<PaginationResult<BookShelfModel[]>>>("/book-shelves")
        .then(response => response.data)
        .catch(axiosErrorHandler);

    if (!result) {
        return [];
    }

    return result.value?.data ?? [];
}