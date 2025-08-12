import {axiosInstance} from "@/shared";
import {axiosErrorHandler} from "@/features/authentication/api";

export interface DeleteBookRequest {
  id: string;
}

export async function deleteBook(
  request: DeleteBookRequest
): Promise<void> {
    await axiosInstance.delete(`/books/${request.id}`).catch(axiosErrorHandler);

    const currentlyReading = JSON.parse(
      localStorage.getItem("currentlyReading") ?? "{}"
    );
    delete currentlyReading[request.id];
    localStorage.setItem("currentlyReading", JSON.stringify(currentlyReading));
}
