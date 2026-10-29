export function installMemoryStorage() {
    for (const name of ["localStorage", "sessionStorage"]) {
        const values = new Map<string, string>();
        Object.defineProperty(globalThis, name, {configurable: true, value: {
            getItem: (key: string) => values.get(key) ?? null,
            setItem: (key: string, value: string) => { values.set(key, value); },
            removeItem: (key: string) => { values.delete(key); },
            clear: () => values.clear(),
        }});
    }
}
