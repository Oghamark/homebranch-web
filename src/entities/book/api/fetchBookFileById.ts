import { fetchBookById } from "./fetchBookById";
import {axiosInstance} from "@/shared";

export async function fetchBookFileById(bookId: string): Promise<Blob> {
  console.log("Fetching book file by ID from backend...");
  try {
    const book = await fetchBookById(bookId);
    return await axiosInstance.get(`/uploads/books/${book.fileName}`, { responseType: 'blob' })
        .then(response => response.data);
  } catch (error) {
    console.error('Failed to fetch books:', error);
    throw error; // Re-throw the error for further handling
  }
}