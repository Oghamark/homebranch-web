export type CreateBookRequest = {
    file: File;
    isFavorite?: boolean;
};

export interface GetBooksByIdsRequest {
    bookIds: string[];
}
