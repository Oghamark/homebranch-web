import { deleteBook } from "@/entities/book/api/deleteBook";
import type { Route } from "./+types/delete-book";
import { toaster } from "@/components/ui/toaster";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Homebranch - Delete Book" }];
}

export async function clientAction({ params }: Route.ClientActionArgs) {
  try {
    return await deleteBook({id: params.id})
      .then(() => {
        toaster.create({
          title: "Book deleted successfully!",
          type: "success",
        });
      })
      .catch((error) => {
        console.error("Error deleting book:", error);
        toaster.create({
          title: "Failed to delete book",
          type: "error",
        });
      });
  } catch (error) {
    console.error("Action failed:", error);
    throw error; // Re-throw the error for further handling
  }
}
