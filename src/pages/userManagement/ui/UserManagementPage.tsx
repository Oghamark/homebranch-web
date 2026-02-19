import {
    Badge,
    Button,
    Card,
    Flex,
    For,
    Heading,
    IconButton,
    Loader,
    Stack,
    Table,
    Text,
} from "@chakra-ui/react";
import {
    useGetUsersInfiniteQuery,
    useRestrictUserMutation,
    type UserModel,
    useUnrestrictUserMutation,
} from "@/entities/user";
import {handleRtkError} from "@/shared/api/rtk-query";
import {toaster} from "@/components/ui/toaster";
import {LuShieldBan, LuShieldCheck, LuUsers} from "react-icons/lu";

function UserActions({user}: { user: UserModel }) {
    const [restrictUser, {isLoading: isRestricting}] = useRestrictUserMutation();
    const [unrestrictUser, {isLoading: isUnrestricting}] = useUnrestrictUserMutation();

    const isLoading = isRestricting || isUnrestricting;

    async function handleToggleRestrict() {
        try {
            if (user.restricted) {
                await unrestrictUser(user.id).unwrap();
                toaster.success({description: `${user.username} has been unrestricted`});
            } else {
                await restrictUser(user.id).unwrap();
                toaster.success({description: `${user.username} has been restricted`});
            }
        } catch (error) {
            handleRtkError(error);
        }
    }

    return (
        <Flex gap={1}>
            <IconButton
                variant="ghost"
                size="sm"
                disabled={isLoading}
                onClick={handleToggleRestrict}
                title={user.restricted ? "Unrestrict user" : "Restrict user"}
            >
                {isLoading ? <Loader/> : user.restricted ? <LuShieldCheck/> : <LuShieldBan/>}
            </IconButton>
        </Flex>
    );
}

export function UserManagementPage() {
    const {data, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage} = useGetUsersInfiniteQuery();

    const users = data?.pages.flatMap(page => page.data) ?? [];

    return (
        <Stack gap={4}>
            <Flex align="center" justify="space-between" display={{base: "none", md: "flex"}}>
                <Flex align="center" gap={3}>
                    <LuUsers size={24}/>
                    <Heading size="2xl">User Management</Heading>
                </Flex>
            </Flex>

            {isLoading ? (
                <Flex justify="center" p={8}>
                    <Loader/>
                </Flex>
            ) : users.length === 0 ? (
                <Flex justify="center" p={8}>
                    <Text color="fg.muted">No users found</Text>
                </Flex>
            ) : (
                <>
                    {/* Mobile card view */}
                    <Stack display={{base: "flex", md: "none"}} gap={3}>
                        <For each={users}>
                            {(user) => (
                                <Card.Root key={user.id}>
                                    <Card.Body p={4}>
                                        <Flex justify="space-between" align="start">
                                            <Stack gap={2}>
                                                <Text fontWeight="medium">{user.username}</Text>
                                                <Text fontSize="sm" color="fg.muted">{user.email}</Text>
                                                <Flex gap={2}>
                                                    <Badge
                                                        variant="subtle"
                                                        colorPalette={user.role?.name === "ADMIN" ? "blue" : "gray"}
                                                    >
                                                        {user.role?.name ?? "User"}
                                                    </Badge>
                                                    <Badge
                                                        variant="subtle"
                                                        colorPalette={user.restricted ? "red" : "green"}
                                                    >
                                                        {user.restricted ? "Restricted" : "Active"}
                                                    </Badge>
                                                </Flex>
                                            </Stack>
                                            <UserActions user={user}/>
                                        </Flex>
                                    </Card.Body>
                                </Card.Root>
                            )}
                        </For>
                    </Stack>

                    {/* Desktop table view */}
                    <Card.Root display={{base: "none", md: "block"}}>
                        <Card.Body p={0}>
                            <Table.Root variant="outline" stickyHeader>
                                <Table.Header>
                                    <Table.Row>
                                        <Table.ColumnHeader>Username</Table.ColumnHeader>
                                        <Table.ColumnHeader>Email</Table.ColumnHeader>
                                        <Table.ColumnHeader>Role</Table.ColumnHeader>
                                        <Table.ColumnHeader>Status</Table.ColumnHeader>
                                        <Table.ColumnHeader textAlign="end"></Table.ColumnHeader>
                                    </Table.Row>
                                </Table.Header>
                                <Table.Body>
                                    <For each={users}>
                                        {(user) => (
                                            <Table.Row key={user.id}>
                                                <Table.Cell fontWeight="medium">{user.username}</Table.Cell>
                                                <Table.Cell color="fg.muted">{user.email}</Table.Cell>
                                                <Table.Cell>
                                                    <Badge
                                                        variant="subtle"
                                                        colorPalette={user.role?.name === "ADMIN" ? "blue" : "gray"}
                                                    >
                                                        {user.role?.name ?? "User"}
                                                    </Badge>
                                                </Table.Cell>
                                                <Table.Cell>
                                                    <Badge
                                                        variant="subtle"
                                                        colorPalette={user.restricted ? "red" : "green"}
                                                    >
                                                        {user.restricted ? "Restricted" : "Active"}
                                                    </Badge>
                                                </Table.Cell>
                                                <Table.Cell textAlign="end">
                                                    <UserActions user={user}/>
                                                </Table.Cell>
                                            </Table.Row>
                                        )}
                                    </For>
                                </Table.Body>
                            </Table.Root>
                        </Card.Body>
                    </Card.Root>
                </>
            )}
            {hasNextPage && (
                <Flex justifyContent="center">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => fetchNextPage()}
                        disabled={isFetchingNextPage}
                    >
                        {isFetchingNextPage ? <Loader/> : "Load more"}
                    </Button>
                </Flex>
            )}
        </Stack>
    );
}
