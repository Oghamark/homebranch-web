import type {BookModel} from "@/entities/book";
import {axiosInstance, type Result} from "@/shared";
import {axiosErrorHandler} from "@/features/authentication/api";
import ToastFactory from "@/app/utils/toast_handler";

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
  if(!request.title || !request.author) {
      ToastFactory({message: "Failed parsing metadata from file", type: 'warning'});
  }
  formData.append("title", request.title);
  formData.append("author", request.author);
  formData.append("isFavorite", String(request.isFavorite));
  formData.append("publishedYear", request.publishedYear);
  formData.append("file", request.file, `${request.title}.epub`);
  if(request.coverImage){
    formData.append("coverImage", request.coverImage, `${request.title}.jpg`);
  }
  return await axiosInstance.postForm<Result<BookModel>>('/books', formData)
      .then(response => response.data.value).catch(axiosErrorHandler) ?? null;
}
