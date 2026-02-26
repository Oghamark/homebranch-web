const PROGRESS_KEY_PREFIX = 'readingProgress';

function getProgressKey(userId: string): string {
    return `${PROGRESS_KEY_PREFIX}_${userId}`;
}

export function getStoredProgress(userId: string, bookId: string): number | undefined {
    if (!userId || typeof localStorage === 'undefined') return undefined;
    const stored = localStorage.getItem(getProgressKey(userId));
    if (!stored) return undefined;
    try {
        const data = JSON.parse(stored);
        const value = data[bookId];
        return typeof value === 'number' ? value : undefined;
    } catch {
        return undefined;
    }
}

export function storeProgress(userId: string, bookId: string, percentage: number): void {
    if (!userId || typeof localStorage === 'undefined') return;
    const key = getProgressKey(userId);
    const stored = localStorage.getItem(key);
    let data: Record<string, number> = {};
    if (stored) {
        try {
            data = JSON.parse(stored);
        } catch {
            data = {};
        }
    }
    data[bookId] = percentage;
    localStorage.setItem(key, JSON.stringify(data));
}

export function removeStoredProgress(userId: string, bookId: string): void {
    if (!userId || typeof localStorage === 'undefined') return;
    const key = getProgressKey(userId);
    const stored = localStorage.getItem(key);
    if (!stored) return;
    try {
        const data = JSON.parse(stored);
        delete data[bookId];
        if (Object.keys(data).length === 0) {
            localStorage.removeItem(key);
        } else {
            localStorage.setItem(key, JSON.stringify(data));
        }
    } catch {
        // ignore
    }
}
