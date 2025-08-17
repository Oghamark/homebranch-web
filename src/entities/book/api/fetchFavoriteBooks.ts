import type { BookModel } from "@/entities/book";
import {axiosInstance, type Result} from "@/shared";
import {axiosErrorHandler} from "@/features/authentication/api";
import type {Params} from "react-router";
import type {PaginationResult} from "@/shared/api/api_response";

export async function fetchFavoriteBooks(params: Params): Promise<PaginationResult<BookModel[]>> {
    return await axiosInstance.get<Result<PaginationResult<BookModel[]>>>(`/books/favorite`, {params: params})
        .then((response) => response.data.value)
        .catch(axiosErrorHandler) ?? {data: [], total: 0};
}
