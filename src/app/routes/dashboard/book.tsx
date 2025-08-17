import type {Route} from "./+types/book";

import {fetchBookById} from "@/entities/book";
import BookDetailsPage from "@/pages/bookDetails/ui/BookDetailsPage";
import {redirect} from "react-router";

export async function clientLoader({ params }: Route.LoaderArgs) {
  const { bookId } = params;
    return await fetchBookById(bookId) ?? redirect('/');
}

export default function Book({ loaderData }: Route.ComponentProps) {
    const { data: book } = loaderData;
  return (
    loaderData ? <BookDetailsPage book={book} /> : null
  );
}


