import type {BookModel} from "@/entities/book";
import {axiosInstance} from "@/shared";

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
): Promise<BookModel> {
  const formData = new FormData();
  formData.append("title", request.title);
  formData.append("author", request.author);
  formData.append("isFavorited", String(request.isFavorited));
  formData.append("publishedYear", request.publishedYear);
  formData.append("file", request.file, `${request.title}.epub`);
  if(request.coverImage){
    formData.append("coverImage", request.coverImage, `${request.title}.jpg`);
  }
  try {
    return (await axiosInstance.postForm('/books', formData)).data;
  } catch (error) {
    console.error("Failed to create book:", error);
    throw error; // Re-throw the error for further handling
  }
}
