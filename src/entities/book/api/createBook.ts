import type {BookModel} from "@/entities/book";
import {axiosInstance} from "@/shared";
import {axiosErrorHandler} from "@/features/authentication/api";

export interface CreateBookRequest {
  title: string;
  author: string;
  isFavorited: boolean;
  publishedYear: string;
  file: Blob;
  coverImage?: Blob;
}

export async function createBook(
  request: CreateBookRequest
): Promise<BookModel | null> {
  const formData = new FormData();
  formData.append("title", request.title);
  formData.append("author", request.author);
  formData.append("isFavorited", String(request.isFavorited));
  formData.append("publishedYear", request.publishedYear);
  formData.append("file", request.file, `${request.title}.epub`);
  if(request.coverImage){
    formData.append("coverImage", request.coverImage, `${request.title}.jpg`);
  }
  return await axiosInstance.postForm<BookModel>('/books', formData)
      .then(response => response.data).catch(axiosErrorHandler) ?? null;
}
