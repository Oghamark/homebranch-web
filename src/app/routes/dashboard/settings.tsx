import type {Route} from "./+types/settings";
import {
    Badge,
    Card,
    Flex,
    Heading,
    Loader,
    Separator,
    Stack,
    Text,
} from "@chakra-ui/react";
import {useGetUserByIdQuery} from "@/entities/user";
import {LuMail, LuSettings, LuShieldCheck, LuUser} from "react-icons/lu";

export function meta({}: Route.MetaArgs) {
    return [
        {title: "Homebranch - Settings"},
    ];
}

export default function Settings() {
    const userId = sessionStorage.getItem("user_id");
    const {data: user, isLoading} = useGetUserByIdQuery(userId ?? "", {
        skip: !userId,
    });

    if (isLoading) {
        return (
            <Flex justify="center" align="center" minH="200px">
                <Loader/>
            </Flex>
        );
    }

    return (
        <Stack gap={4}>
            <Flex align="center" gap={3} display={{base: "none", md: "flex"}}>
                <LuSettings size={24}/>
                <Heading size="2xl">Account Settings</Heading>
            </Flex>

            <Card.Root>
                <Card.Header>
                    <Card.Title>Profile</Card.Title>
                </Card.Header>
                <Card.Body>
                    {user ? (
                        <Stack gap={4}>
                            <Flex align="center" gap={3}>
                                <LuUser/>
                                <Stack gap={0}>
                                    <Text fontWeight="medium">{user.username}</Text>
                                    <Text fontSize="sm" color="fg.muted">Username</Text>
                                </Stack>
                            </Flex>
                            <Separator/>
                            <Flex align="center" gap={3}>
                                <LuMail/>
                                <Stack gap={0}>
                                    <Text fontWeight="medium">{user.email}</Text>
                                    <Text fontSize="sm" color="fg.muted">Email</Text>
                                </Stack>
                            </Flex>
                            <Separator/>
                            <Flex align="center" gap={3}>
                                <LuShieldCheck/>
                                <Stack gap={0}>
                                    <Badge
                                        variant="subtle"
                                        colorPalette={user.role?.name === "ADMIN" ? "blue" : "gray"}
                                    >
                                        {user.role?.name ?? "User"}
                                    </Badge>
                                    <Text fontSize="sm" color="fg.muted" mt={1}>Role</Text>
                                </Stack>
                            </Flex>
                        </Stack>
                    ) : (
                        <Text color="fg.muted">Unable to load profile information</Text>
                    )}
                </Card.Body>
            </Card.Root>
        </Stack>
    );
}
