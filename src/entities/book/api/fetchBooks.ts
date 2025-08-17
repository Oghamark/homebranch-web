import type {BookModel} from "@/entities/book";
import {axiosInstance, type Result} from "@/shared";
import {axiosErrorHandler} from "@/features/authentication/api";
import type {PaginationResult} from "@/shared/api/api_response";
import type {Params} from "react-router";

export async function fetchBooks(params: Params): Promise<PaginationResult<BookModel[]>> {
    return await axiosInstance.get<Result<PaginationResult<BookModel[]>>>('/books', {params: {
        limit: params.limit,
        offset: params.offset,
        }})
        .then((response) => response.data.value)
        .catch(axiosErrorHandler) ?? {data: [], total: 0};
}