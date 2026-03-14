import {createContext, type ReactNode, useContext, useEffect, useState} from "react";

interface MobileNavContextValue {
    title: string | null;
    setTitle: (title: string | null) => void;
    rightAction: ReactNode;
    setRightAction: (action: ReactNode) => void;
    showUserToggle: boolean;
    setShowUserToggle: (show: boolean) => void;
}

const MobileNavContext = createContext<MobileNavContextValue>({
    title: null,
    setTitle: () => {},
    rightAction: null,
    setRightAction: () => {},
    showUserToggle: false,
    setShowUserToggle: () => {},
});

export function MobileNavProvider({children}: { children: ReactNode }) {
    const [title, setTitle] = useState<string | null>(null);
    const [rightAction, setRightAction] = useState<ReactNode>(null);
    const [showUserToggle, setShowUserToggle] = useState(false);

    return (
        <MobileNavContext.Provider value={{title, setTitle, rightAction, setRightAction, showUserToggle, setShowUserToggle}}>
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

/**
 * Hook to show the user toggle (ShowAllUsersButton) in the mobile nav header.
 * Cleans up on unmount.
 */
export function useMobileNavUserToggle() {
    const {setShowUserToggle} = useMobileNav();

    useEffect(() => {
        setShowUserToggle(true);
        return () => setShowUserToggle(false);
    }, []);
}
