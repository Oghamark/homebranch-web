import {useSearchParams} from "react-router";
import type {BookSortDirection, BookSortField} from "@/entities/book/api/types";

export interface LibraryFilterValues {
    genre: string;
    yearFrom: string;
    yearTo: string;
    series: string;
    language: string;
    publisher: string;
    sortBy: BookSortField;
    sortDirection: BookSortDirection;
}

export type LibraryFilterKey = keyof LibraryFilterValues;

const filterKeys: LibraryFilterKey[] = [
    "genre", "yearFrom", "yearTo", "series", "language", "publisher", "sortBy", "sortDirection"
];
const sortFields: BookSortField[] = ["title", "author", "publishedYear"];

export function useLibraryFilters() {
    const [params, setParams] = useSearchParams();
    const requestedSort = params.get("sortBy");
    const filters: LibraryFilterValues = {
        genre: params.get("genre") ?? "",
        yearFrom: params.get("yearFrom") ?? "",
        yearTo: params.get("yearTo") ?? "",
        series: params.get("series") ?? "",
        language: params.get("language") ?? "",
        publisher: params.get("publisher") ?? "",
        sortBy: sortFields.find(field => field === requestedSort) ?? "title",
        sortDirection: params.get("sortDirection") === "DESC" ? "DESC" : "ASC",
    };

    function setFilter(key: LibraryFilterKey, value: string) {
        setParams(previous => {
            const next = new URLSearchParams(previous);
            if (value) next.set(key, value);
            else next.delete(key);
            return next;
        }, {replace: true, preventScrollReset: true});
    }

    function clearFilters() {
        setParams(previous => {
            const next = new URLSearchParams(previous);
            filterKeys.forEach(key => next.delete(key));
            return next;
        }, {replace: true, preventScrollReset: true});
    }

    return {
        filters,
        setFilter,
        clearFilters,
        hasFilters: filterKeys.some(key => params.has(key)),
    };
}
