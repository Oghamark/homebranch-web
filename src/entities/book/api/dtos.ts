export type CreateBookRequest = {
  file: File;
  isFavorite?: boolean;
  title?: string;
  author?: string;
};

export interface GetBooksByIdsRequest {
  bookIds: string[];
}
