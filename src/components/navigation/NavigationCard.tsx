import {Card, Flex, Heading, Separator} from "@chakra-ui/react";
import {LuBookOpen} from "react-icons/lu";
import {NavigationContent} from "./NavigationContent";

export function NavigationCard() {
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
            <Flex align={"center"} justify={"center"} gap={2} flexShrink={0}>
                <LuBookOpen size={36}/>
                <Heading>HomeBranch</Heading>
            </Flex>
            <Separator my={4}/>
            <NavigationContent/>
        </Card.Root>
    );
}
