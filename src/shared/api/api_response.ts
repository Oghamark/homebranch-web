export type Result<T> = {
    success: boolean,
    value?: T,
    failure?: string;
}