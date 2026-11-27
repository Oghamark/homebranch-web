export type QueriedSearch<T extends {} = {}> = T & { query: string; userId?: string }

export type BookSortField = "title" | "author" | "publishedYear";
export type BookSortDirection = "ASC" | "DESC";

export interface BookQueryFilters {
    genreFilter?: string;
    seriesFilter?: string;
    language?: string;
    publisher?: string;
    yearFrom?: string;
    yearTo?: string;
    sortBy?: BookSortField;
    sortDirection?: BookSortDirection;
}

export type LibraryBooksQuery = QueriedSearch<BookQueryFilters>;
