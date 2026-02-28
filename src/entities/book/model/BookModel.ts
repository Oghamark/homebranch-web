export type BookModel = {
    id: string;
    title: string;
    author: string;
    fileName: string;
    isFavorite: boolean;
    publishedYear: string;
    coverImageFileName: string;
    summary?: string;
    uploadedByUserId: string;
}