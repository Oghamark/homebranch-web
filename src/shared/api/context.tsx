import {createContext, type PropsWithChildren, useEffect} from "react";
import {useNavigate} from "react-router";
import {setNavigateCallback} from "@/shared/api/axios";

const AuthContext = createContext<{ userId: string | null } | null>(null);

export const AuthContextProvider = ({children}: PropsWithChildren) => {
    const navigate = useNavigate();

    const userId = null; // TODO: This will be populated at login and logout at some point

    useEffect(() => {
        setNavigateCallback(navigate);
    }, [navigate]);

    return <AuthContext.Provider value={{userId}}>{children}</AuthContext.Provider>;
}