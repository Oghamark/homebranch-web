import {createContext, useContext, useEffect, useId, useRef, useState} from "react";

export const SettingsDraftContext = createContext<(id: string, dirty: boolean) => void>(() => {});

export function useSettingsDraft<T>(incoming: T | undefined, fallback: T) {
    const [value, setValue] = useState(fallback);
    const [saved, setSaved] = useState(fallback);
    const dirty = JSON.stringify(value) !== JSON.stringify(saved);
    const dirtyRef = useRef(dirty);
    dirtyRef.current = dirty;
    const report = useContext(SettingsDraftContext);
    const id = useId();
    useEffect(() => {
        if (incoming !== undefined && !dirtyRef.current) {
            setValue(incoming);
            setSaved(incoming);
        }
    }, [incoming]);
    useEffect(() => {
        report(id, dirty);
        return () => report(id, false);
    }, [dirty, id, report]);
    return {value, setValue, dirty, accept(next: T) {setValue(next); setSaved(next);}};
}
