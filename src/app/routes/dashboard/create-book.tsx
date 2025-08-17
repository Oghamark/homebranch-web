import type {Route} from "./+types/create-book";
import {toaster} from "@/components/ui/toaster";
import {createBook, type CreateBookRequest} from "@/entities/book";
import Epub from "epubjs";
import axios from "axios";

export function meta({}: Route.MetaArgs) {
    return [
        {title: "Homebranch - Create Book"},
    ];
}

export async function clientAction({request}: Route.ClientActionArgs) {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[] | null
    if (files && files.length > 0) {
        const epub = Epub(await files[0].arrayBuffer());
        const metadata = await epub.loaded.metadata;

        const coverImageUrl = await epub.coverUrl();
        let coverImageBlob: Blob | undefined = undefined;
        if (coverImageUrl) {
            coverImageBlob = await axios.get<Blob>(coverImageUrl, {responseType: 'blob'})
                .then(response => response.data);
        }

        const createBookRequest: CreateBookRequest = {
            title: metadata.title,
            author: metadata.creator,
            isFavorited: false,
            publishedYear: new Date(metadata.pubdate).getFullYear().toString(),
            file: files[0],
            coverImage: coverImageBlob,
        };
        await createBook(createBookRequest).then(response => {
            if (response) {
                toaster.create({
                    title: "Book created successfully!",
                    type: "success",
                });
            }
        });
    }
}
