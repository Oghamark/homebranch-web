import {Box} from "@chakra-ui/react";
import {NavigationCard} from "@/components/navigation/NavigationCard";
import React from "react";
import {Outlet} from "react-router";

export default function Layout() {
    return (
        <>
            <Box visibility={{base: "hidden", md: "visible"}}>
                <NavigationCard/>
            </Box>
            <Box p={4} pt={0} ml={{base: 0, md: "250px"}} height={"100%"}>
                <Outlet/>
            </Box>
        </>

    )
}