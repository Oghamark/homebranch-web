import type {Route} from "./+types/settings";
import {
    Badge,
    Card,
    Flex,
    Heading,
    Loader,
    Separator,
    Stack,
    Switch,
    Text,
} from "@chakra-ui/react";
import {useGetUserByIdQuery} from "@/entities/user";
import {useGetAuthConfigQuery, useUpdateAuthConfigMutation} from "@/entities/authConfig";
import {LuMail, LuSettings, LuShieldCheck, LuUser, LuUserPlus} from "react-icons/lu";
import {handleRtkError} from "@/shared/api/rtk-query";

export function meta({}: Route.MetaArgs) {
    return [
        {title: "Homebranch - Settings"},
    ];
}

export default function Settings() {
    const userId = sessionStorage.getItem("user_id");
    const userRole = sessionStorage.getItem("user_role") ?? "USER";
    const isAdmin = userRole === "ADMIN";
    const {data: user, isLoading} = useGetUserByIdQuery(userId ?? "", {
        skip: !userId,
    });
    const {data: authConfig} = useGetAuthConfigQuery(undefined, {skip: !isAdmin});
    const [updateAuthConfig] = useUpdateAuthConfigMutation();

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
                                    <Text fontWeight="medium">{user.name}</Text>
                                    <Text fontSize="sm" color="fg.muted">Name</Text>
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
                                        colorPalette={userRole === "ADMIN" ? "blue" : "gray"}
                                    >
                                        {userRole}
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

            {isAdmin && (
                <Card.Root>
                    <Card.Header>
                        <Card.Title>Authentication Settings</Card.Title>
                    </Card.Header>
                    <Card.Body>
                        <Flex align="center" gap={3} justify="space-between">
                            <Flex align="center" gap={3}>
                                <LuUserPlus/>
                                <Stack gap={0}>
                                    <Text fontWeight="medium">Allow Sign Up</Text>
                                    <Text fontSize="sm" color="fg.muted">
                                        {authConfig?.signupEnabled ? "New users can self-register" : "Registration is disabled"}
                                    </Text>
                                </Stack>
                            </Flex>
                            <Switch.Root
                                checked={authConfig?.signupEnabled ?? false}
                                onCheckedChange={async ({checked}) => {
                                    try {
                                        await updateAuthConfig({signupEnabled: checked}).unwrap();
                                    } catch (error) {
                                        handleRtkError(error);
                                    }
                                }}
                            >
                                <Switch.HiddenInput/>
                                <Switch.Control>
                                    <Switch.Thumb/>
                                </Switch.Control>
                            </Switch.Root>
                        </Flex>
                    </Card.Body>
                </Card.Root>
            )}
        </Stack>
    );
}
