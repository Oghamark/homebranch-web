import type { BookModel } from "@/entities/book";
import {axiosInstance} from "@/shared";

export async function fetchFavoritedBooks(): Promise<BookModel[]> {
  console.log("Fetching books from backend...");
  try {
    return await axiosInstance.get(`/books/favorited`)
        .then((response) => response.data);
  } catch (error) {
    console.error('Failed to fetch books:', error);
    throw error; // Re-throw the error for further handling
  }
}