import {createContext, type ReactNode, useContext, useEffect, useState} from "react";

interface MobileNavContextValue {
    title: string | null;
    setTitle: (title: string | null) => void;
    rightAction: ReactNode;
    setRightAction: (action: ReactNode) => void;
}

const MobileNavContext = createContext<MobileNavContextValue>({
    title: null,
    setTitle: () => {},
    rightAction: null,
    setRightAction: () => {},
});

export function MobileNavProvider({children}: { children: ReactNode }) {
    const [title, setTitle] = useState<string | null>(null);
    const [rightAction, setRightAction] = useState<ReactNode>(null);

    return (
        <MobileNavContext.Provider value={{title, setTitle, rightAction, setRightAction}}>
            {children}
        </MobileNavContext.Provider>
    );
}

export function useMobileNav() {
    return useContext(MobileNavContext);
}

/**
 * Hook to set the mobile nav title and optionally a right action.
 * Cleans up on unmount.
 */
export function useMobileNavConfig(title: string, rightAction?: ReactNode) {
    const {setTitle, setRightAction} = useMobileNav();

    useEffect(() => {
        setTitle(title);
        if (rightAction !== undefined) {
            setRightAction(rightAction);
        }
        return () => {
            setTitle(null);
            setRightAction(null);
        };
    }, [title, rightAction]);
}
