import type {BookModel} from "./BookModel";

export type BookDuplicateModel = {
    id: string;
    suspectBookId: string;
    originalBookId: string;
    flaggedAt: string;
    resolvedAt?: string;
    resolution?: 'merge' | 'keep_both' | 'replace';
    resolvedByUserId?: string;
};

export type BookDuplicateWithBooksModel = {
    duplicate: BookDuplicateModel;
    suspectBook: BookModel;
    originalBook: BookModel;
};
