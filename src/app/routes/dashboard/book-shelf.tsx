import type { Route } from './+types/book-shelf';

import {LibraryPage} from "@/pages/library";
import {getBookShelfBooks} from "@/entities/bookShelf";

export async function clientLoader({params}: Route.ClientLoaderArgs){
    const {bookShelfId} = params;
    return await getBookShelfBooks(bookShelfId) ?? {data: [], total: 0};
}

export default function BookShelf({loaderData}: Route.ComponentProps){
    const {data: books, total} = loaderData;
    return <LibraryPage books={books} total={total} />
}