export type CreateBookRequest = {
  file: File;
  isFavorite?: boolean;
  title?: string;
  author?: string;
};

export interface GetBooksByIdsRequest {
  bookIds: string[];
}

export type UpdateBookPayload = {
  id: string;
  title?: string;
  author?: string;
  summary?: string;
  genres?: string[];
  publishedYear?: number;
  series?: string;
  seriesPosition?: number;
  isbn?: string;
  pageCount?: number;
  publisher?: string;
  language?: string;
};
