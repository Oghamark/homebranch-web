import {Button, Flex} from "@chakra-ui/react";
import {LuUser, LuUsers} from "react-icons/lu";
import {useAppDispatch} from "@/app/hooks";
import {toggleShowAllUsers} from "@/features/library/store/librarySlice";
import {useShowAllUsers} from "@/features/library/hooks/useShowAllUsers";

interface ShowAllUsersButtonProps {
    showLabel?: boolean;
}

export function ShowAllUsersButton({showLabel = false}: ShowAllUsersButtonProps) {
    const dispatch = useAppDispatch();
    const showAllUsers = useShowAllUsers();

    const label = showAllUsers ? "All Libraries" : "My Library";
    const ariaLabel = showAllUsers ? "Show only my books" : "Show all users' books";

    if (showLabel) {
        return (
            <Button
                variant="ghost"
                size="sm"
                aria-label={ariaLabel}
                onClick={() => dispatch(toggleShowAllUsers())}
                gap={2}
            >
                {showAllUsers ? <LuUsers/> : <LuUser/>}
                {label}
            </Button>
        );
    }

    return (
        <Button
            variant="ghost"
            size="sm"
            aria-label={ariaLabel}
            onClick={() => dispatch(toggleShowAllUsers())}
        >
            {showAllUsers ? <LuUsers/> : <LuUser/>}
        </Button>
    );
}
