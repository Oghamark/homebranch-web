import {useSearchParams} from "react-router";

export function useLibrarySearch() {
    const [params] = useSearchParams();
    return params.get("q") ?? "";
}

export function useCollectionSearch() {
    const [params, setParams] = useSearchParams();
    const query = params.get("q") ?? "";
    const setQuery = (value: string) => setParams(previous => {
        const next = new URLSearchParams(previous);
        if (value) next.set("q", value);
        else next.delete("q");
        return next;
    }, {replace: true, preventScrollReset: true});
    return {query, setQuery};
}