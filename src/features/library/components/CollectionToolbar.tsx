import {Flex} from "@chakra-ui/react";
import {SearchLibrary} from "./SearchLibrary";
import {ShowAllUsersButton} from "./ShowAllUsersButton";
import {LibraryDisplayOptions} from "./LibraryDisplayOptions";
import {useLibraryDisplayMode} from "../hooks/useLibraryDisplayPreferences";
import {setDisplayMode} from "../store/librarySlice";
import {useAppDispatch} from "@/app/hooks";

export function CollectionToolbar({label, scope = false, display = true}: {label?: string; scope?: boolean; display?: boolean}) {
    const mode = useLibraryDisplayMode();
    const dispatch = useAppDispatch();
    return <Flex as="section" aria-label="Collection controls" align="end" gap={4} wrap="wrap" py={3} borderBottomWidth="1px">
        <SearchLibrary label={label}/>
        <Flex gap={2} wrap="wrap" align="center" pb={1}>
            {scope && <ShowAllUsersButton showLabel/>}
            {display && <LibraryDisplayOptions displayMode={mode} onDisplayModeChange={mode => dispatch(setDisplayMode(mode))}/>}
        </Flex>
    </Flex>;
}
