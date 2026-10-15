import {Box} from "@chakra-ui/react";
import {NavigationCard} from "@/components/navigation/NavigationCard";
import {MobileNavigation} from "@/components/navigation/MobileNavigation";
import {MobileNavProvider} from "@/components/navigation/MobileNavContext";
import React from "react";
import {Outlet, redirect, useLocation} from "react-router";
import {useLibraryEvents} from "@/shared/hooks";
import {DragDropOverlay} from "@/entities/book";
import {checkCloudAccess} from "@/features/authentication/api/cloudAccess";

export async function clientLoader() {
    let user_id = sessionStorage.getItem("user_id");

    if (!user_id) {
        return redirect("/login");
    }

    return await checkCloudAccess();
}

export default function Layout() {
    useLibraryEvents();
    const isReader = /^\/books\/[^/]+\/read$/.test(useLocation().pathname);

    return (
        <MobileNavProvider>
            {!isReader && <a href="#main-content" className="skip-to-content">Skip to content</a>}
            <DragDropOverlay/>
            <MobileNavigation/>
            <Box display={isReader ? "none" : {base: "none", md: "block"}}>
                <NavigationCard/>
            </Box>
            <Box as="main" id="main-content" tabIndex={-1} minW={0}
                p={isReader ? 0 : {base: 4, md: 8}} ml={isReader ? 0 : {base: 0, md: "266px"}}
                minH={isReader ? "100dvh" : "calc(100dvh - 60px)"} height={isReader ? "100%" : undefined}
                maxW="1800px" pb={isReader ? 0 : "max(24px, env(safe-area-inset-bottom))"}>
                <Outlet/>
            </Box>
        </MobileNavProvider>
    )
}
