import {createContext, useCallback, useContext, useMemo, useState, type ReactNode} from "react";
import type {BookModel} from "@/entities/book";

export interface BookSelection {
    selected: ReadonlyMap<string, BookModel>;
    busy: boolean;
    setBusy: (busy: boolean) => void;
    clear: () => void;
    toggle: (book: BookModel) => void;
    toggleDisplayed: (books: BookModel[]) => void;
    remove: (ids: string[]) => void;
}

const BookSelectionContext = createContext<BookSelection | undefined>(undefined);

export function BookSelectionProvider({children}: {children: ReactNode}) {
    const [selected, setSelected] = useState<Map<string, BookModel>>(new Map());
    const [busy, setBusy] = useState(false);
    const remove = useCallback((ids: string[]) => {
        setSelected(previous => {
            const next = new Map(previous);
            for (const id of ids) next.delete(id);
            return next;
        });
    }, []);
    const value = useMemo<BookSelection>(() => ({
        selected, busy, setBusy, remove,
        clear: () => {if (!busy) setSelected(new Map());},
        toggle: book => {
            if (busy) return;
            setSelected(previous => {
                const next = new Map(previous);
                if (next.has(book.id)) next.delete(book.id);
                else next.set(book.id, book);
                return next;
            });
        },
        toggleDisplayed: books => {
            if (busy) return;
            setSelected(previous => {
                const next = new Map(previous);
                const allSelected = books.every(book => next.has(book.id));
                for (const book of books) {
                    if (allSelected) next.delete(book.id);
                    else next.set(book.id, book);
                }
                return next;
            });
        },
    }), [selected, busy, remove]);
    return <BookSelectionContext.Provider value={value}>{children}</BookSelectionContext.Provider>;
}

export function useBookSelection() {
    return useContext(BookSelectionContext);
}
