import {Card, Flex, Separator} from "@chakra-ui/react";
import {NavigationContent} from "./NavigationContent";
import {useColorMode} from "@/shared/ui/color-mode";

export function NavigationCard() {
    const {colorMode} = useColorMode();
    const logoSrc = colorMode === "dark"
        ? "/Logo%20Monochrome%20For%20Dark.svg"
        : "/Logo%20Monochrome%20For%20Light.svg";

    return (
        <Card.Root
            borderRadius="lg"
            borderWidth="1px"
            p={4}
            mr={4}
            boxShadow="md"
            position={"fixed"}
            float={"left"}
            width="250px"
            height={"calc(100vh - 2rem)"}
            display="flex"
            flexDirection="column"
            overflow="hidden"
        >
            <Flex align={"center"} justify={"center"} flexShrink={0}>
                <img src={logoSrc} alt="HomeBranch" style={{height: "48px"}}/>
            </Flex>
            <Separator my={4}/>
            <NavigationContent/>
        </Card.Root>
    );
}
