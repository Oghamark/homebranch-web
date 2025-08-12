import type {Route} from "./+types/book";

import {fetchBookById} from "@/entities/book";
import BookDetailsPage from "@/pages/bookDetails/ui/BookDetailsPage";

export async function clientLoader({ params }: Route.LoaderArgs) {
  const { bookId } = params;
    return await fetchBookById(bookId);
}

export default function Book({ loaderData }: Route.ComponentProps) {
  return (
    loaderData ? <BookDetailsPage book={loaderData} /> : null
  );
}


