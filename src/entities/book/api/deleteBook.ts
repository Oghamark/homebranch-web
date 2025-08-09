import {axiosInstance} from "@/shared";

export interface DeleteBookRequest {
  id: string;
}

export async function deleteBook(
  request: DeleteBookRequest
): Promise<void> {
  try {
    await axiosInstance.delete(`/books/${request.id}`);

    localStorage.getItem(`currentlyReading`);
    const currentlyReading = JSON.parse(
      localStorage.getItem("currentlyReading") ?? "{}"
    );
    delete currentlyReading[request.id];
    localStorage.setItem("currentlyReading", JSON.stringify(currentlyReading));

  } catch (error) {
    console.error("Failed to delete book:", error);
    throw error; // Re-throw the error for further handling
  }
}
