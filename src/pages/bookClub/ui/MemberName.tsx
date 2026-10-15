import {createContext, useContext, type ReactNode} from "react";
import {useGetDisplayNamesQuery} from "@/entities/user/api/api";

const MemberNamesContext = createContext<string[] | null>(null);

export function MemberNamesProvider({userIds, children}: {userIds: string[]; children: ReactNode}) {
    return <MemberNamesContext.Provider value={userIds}>{children}</MemberNamesContext.Provider>;
}

export function MemberName({userId}: {userId: string}) {
    const batch = useContext(MemberNamesContext);
    const ids = batch?.includes(userId) ? batch : [userId];
    const {currentData, isError, isFetching, isSuccess, refetch} = useGetDisplayNamesQuery(ids);
    if (isError) return <button type="button" onClick={() => void refetch()} aria-label="Retry loading member name">Retry name</button>;
    const name = currentData?.find(({id}) => id.toLowerCase() === userId.toLowerCase())?.name;
    if (name) return <>{name}</>;
    if (isSuccess && !isFetching && currentData) return <>Former member</>;
    return <>Loading member…</>;
}
