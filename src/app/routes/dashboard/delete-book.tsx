import { deleteBook } from "@/entities/book/api/deleteBook";
import type { Route } from "./+types/delete-book";
import { toaster } from "@/components/ui/toaster";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Homebranch - Delete Book" }];
}

export async function clientAction({ params }: Route.ClientActionArgs) {
    return await deleteBook({id: params.id})
      .then(() => {
        toaster.create({
          title: "Book deleted successfully!",
          type: "success",
        });
      })
}
