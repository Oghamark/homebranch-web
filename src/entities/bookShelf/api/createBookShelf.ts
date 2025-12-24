import {axiosInstance, type Result} from "@/shared";
import {axiosErrorHandler} from "@/features/authentication/api";
import type {BookShelfModel} from "@/entities/bookShelf/model/BookShelfModel";

interface CreateBookShelfRequest {
    title: string;
}

export async function createBookShelf(request: CreateBookShelfRequest): Promise<Result<BookShelfModel> | null> {
    return await axiosInstance.post<Result<BookShelfModel>>("/book-shelves", request)
        .then(response => response.data)
        .catch(axiosErrorHandler);
}