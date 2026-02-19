import {Box} from "@chakra-ui/react";
import {NavigationCard} from "@/components/navigation/NavigationCard";
import {MobileNavigation} from "@/components/navigation/MobileNavigation";
import {MobileNavProvider} from "@/components/navigation/MobileNavContext";
import React from "react";
import {Outlet, redirect} from "react-router";

export async function clientLoader() {
    let user_id = sessionStorage.getItem("user_id");

    if (!user_id) {
        return redirect("/login");
    }
}

export default function Layout() {
    return (
        <MobileNavProvider>
            <MobileNavigation/>
            <Box display={{base: "none", md: "block"}}>
                <NavigationCard/>
            </Box>
            <Box p={4} pt={{base: 0, md: 0}} ml={{base: 0, md: "250px"}} height={"100%"}>
                <Outlet/>
            </Box>
        </MobileNavProvider>
    )
}
