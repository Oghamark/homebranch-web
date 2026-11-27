import ToastFactory from "@/shared/lib/toast/toast";

export function clearDeletedBooksFromLocalStorage(userId: string | null, bookIds: string[]): void {
    if (!userId || typeof localStorage === "undefined" || bookIds.length === 0) return;
    try {
        for (const key of [`currentlyReading_${userId}`, `readingProgress_${userId}`]) {
            const stored = localStorage.getItem(key);
            if (stored === null) continue;
            const data: unknown = JSON.parse(stored);
            if (typeof data !== "object" || data === null || Array.isArray(data)) {
                throw new Error("Invalid local reading history");
            }
            for (const id of bookIds) Reflect.deleteProperty(data, id);
            if (Object.keys(data).length === 0) localStorage.removeItem(key);
            else localStorage.setItem(key, JSON.stringify(data));
        }
        for (const id of bookIds) {
            localStorage.removeItem(`reader_position_time_${userId}_${id}`);
            localStorage.removeItem(`reader_position_sync_${userId}_${id}`);
        }
    } catch {
        console.warn("Deleted books could not be removed from local reading history");
        ToastFactory({message: "Books were deleted, but local reading history could not be cleared.", type: "error"});
    }
}
