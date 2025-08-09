import type { BookModel } from "@/entities/book";
import {axiosInstance} from "@/shared";
import type {AxiosError} from "axios";

export async function fetchBookById(bookId: string): Promise<BookModel> {
  console.log("Fetching book by ID from backend...");
  try {
      return await axiosInstance.get(`/books/${bookId}`)
          .then(response => response.data)
          .catch((error: AxiosError) => {
              // Check for Axios 404 error
              if (error && error.response && error.response.status === 404) {
                  const message = `Book not found (ID: ${bookId})`;
                  console.error(message);
                  throw new Error(message);
              }
          });
  } catch (error) {
    console.error('Failed to fetch books:', error);
    throw error; // Re-throw the error for further handling
  }
}