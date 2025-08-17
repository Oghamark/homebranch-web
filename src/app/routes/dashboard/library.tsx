import {LibraryPage} from "@/pages/library";
import type {Route} from "./+types/library";
import {fetchBooks} from "@/entities/book";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Homebranch - Library" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export async function clientLoader({}: Route.LoaderArgs) {
    return await fetchBooks({limit: '50', offset: '0'});
}

export default function Library({loaderData}: Route.ComponentProps) {
    const { data: books, total } = loaderData;
    return <LibraryPage books={books} total={total} />;
}
