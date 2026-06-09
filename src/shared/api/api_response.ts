export type Result<T> = {
    success: boolean,
    value?: T,
    error?: string;
    message?: string;
};

export type PaginationResult<T> = {
    data: T,
    total?: number,
    nextCursor: number | null,
    limit?: number,
    offset?: number,
};