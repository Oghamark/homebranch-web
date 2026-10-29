import {useCallback, useRef, useState, type ReactNode} from "react";
import {Button, Dialog, Portal} from "@chakra-ui/react";
import {useBeforeUnload, useBlocker} from "react-router";
import {SettingsDraftContext} from "./useSettingsDraft";

export function SettingsNavigationGuard({children}: {children: ReactNode}) {
    const [drafts, setDrafts] = useState<Record<string, boolean>>({});
    const dirty = Object.values(drafts).some(Boolean);
    const report = useCallback((id: string, changed: boolean) => {
        setDrafts(previous => previous[id] === changed ? previous : {...previous, [id]: changed});
    }, []);
    const blocker = useBlocker(({currentLocation, nextLocation}) => dirty &&
        (currentLocation.pathname !== nextLocation.pathname || currentLocation.search !== nextLocation.search));
    const cancelRef = useRef<HTMLButtonElement>(null);
    useBeforeUnload(useCallback((event) => {
        if (dirty) {event.preventDefault(); event.returnValue = "";}
    }, [dirty]));
    return <SettingsDraftContext.Provider value={report}>
        {children}
        <Dialog.Root role="alertdialog" open={blocker.state === "blocked"} initialFocusEl={() => cancelRef.current}
            onOpenChange={({open}) => {if (!open && blocker.state === "blocked") blocker.reset();}}>
            <Portal><Dialog.Backdrop/><Dialog.Positioner p={4}><Dialog.Content>
                <Dialog.Header><Dialog.Title>Discard unsaved settings?</Dialog.Title></Dialog.Header>
                <Dialog.Body><Dialog.Description>Your changes have not been saved. Stay here to save them, or discard them and leave this section.</Dialog.Description></Dialog.Body>
                <Dialog.Footer flexWrap="wrap">
                    <Button ref={cancelRef} minH="44px" variant="outline" onClick={() => blocker.state === "blocked" && blocker.reset()}>Keep editing</Button>
                    <Button minH="44px" colorPalette="red" onClick={() => blocker.state === "blocked" && blocker.proceed()}>Discard changes</Button>
                </Dialog.Footer>
            </Dialog.Content></Dialog.Positioner></Portal>
        </Dialog.Root>
    </SettingsDraftContext.Provider>;
}
