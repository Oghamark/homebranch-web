import type { Route } from "./+types/book";

import { fetchBookById } from "@/entities/book";
import BookDetailsPage from "@/pages/bookDetails/ui/BookDetailsPage";
import { redirect } from "react-router";

export async function clientLoader({ params }: Route.LoaderArgs) {
  try {
  const { bookId } = params;
  return await fetchBookById(bookId);
  } catch (error) {
    console.error("Error fetching book:", error);
    return redirect("/");
  }
}

export default function Book({ loaderData }: Route.ComponentProps) {
  return (
    <BookDetailsPage book={loaderData} />
  );
}


