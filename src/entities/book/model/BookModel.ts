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
    genres?: string[];
    series?: string;
    seriesPosition?: number;
    isbn?: string;
    pageCount?: number;
    publisher?: string;
    language?: string;
    averageRating?: number;
    ratingsCount?: number;
    metadataFetchedAt?: string;
}