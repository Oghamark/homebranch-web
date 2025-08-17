export type Result<T> = {
    success: boolean,
    value?: T,
    failure?: string;
};

export type PaginationResult<T> = {
    data: T,
    total: number,
    nextCursor?: number,
};