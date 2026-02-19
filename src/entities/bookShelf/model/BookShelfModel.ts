import type {BookModel} from "@/entities/book";

export type BookShelfModel = {
    id: string;
    title: string;
    books: BookModel[];
}