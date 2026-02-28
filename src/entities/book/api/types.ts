export type QueriedSearch<T extends {} = {}> = T & { query: string; userId?: string }
