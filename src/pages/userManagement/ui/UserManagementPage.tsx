import {
    Badge,
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
    CreateUserDialog,
    useDeleteUserMutation,
    useGetUsersQuery,
    type UserModel,
    useUpdateUserRoleMutation,
} from "@/entities/user";
import {handleRtkError} from "@/shared/api/rtk-query";
import {toaster} from "@/components/ui/toaster";
import {LuCrown, LuUser, LuUsers} from "react-icons/lu";
import {DeleteConfirmationDialog} from "@/components/ui/modals/DeleteConfirmationDialog";

function UserActions({user}: { user: UserModel }) {
    const [deleteUser, {isLoading: isDeleting}] = useDeleteUserMutation();
    const [updateUserRole, {isLoading: isUpdatingRole}] = useUpdateUserRoleMutation();

    const currentUserId = sessionStorage.getItem("user_id");
    const isSelf = user.id === currentUserId;

    async function handleToggleRole() {
        try {
            const newRole = user.role === 'ADMIN' ? 'USER' : 'ADMIN';
            await updateUserRole({id: user.id, role: newRole}).unwrap();
            toaster.success({description: `${user.name} is now ${newRole}`});
        } catch (error) {
            handleRtkError(error);
        }
    }

    async function handleDelete() {
        try {
            await deleteUser(user.email).unwrap();
            toaster.success({description: `${user.name} has been deleted`});
        } catch (error) {
            handleRtkError(error);
        }
    }

    return (
        <Flex gap={1}>
            {!isSelf && (
                <IconButton
                    variant="ghost"
                    size="sm"
                    disabled={isUpdatingRole}
                    onClick={handleToggleRole}
                    title={user.role === 'ADMIN' ? "Demote to User" : "Promote to Admin"}
                >
                    {isUpdatingRole ? <Loader/> : user.role === 'ADMIN' ? <LuUser/> : <LuCrown/>}
                </IconButton>
            )}
            {!isSelf && (
                <DeleteConfirmationDialog
                    title={`Delete ${user.name}?`}
                    loading={isDeleting}
                    onSubmit={handleDelete}
                    size="sm"
                />
            )}
        </Flex>
    );
}

export function UserManagementPage() {
    const {data: users = [], isLoading} = useGetUsersQuery();

    return (
        <Stack gap={4}>
            <Flex align="center" justify="space-between" display={{base: "none", md: "flex"}}>
                <Flex align="center" gap={3}>
                    <LuUsers size={24}/>
                    <Heading size="2xl">User Management</Heading>
                </Flex>
                <CreateUserDialog/>
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
                        <Flex justify="flex-end">
                            <CreateUserDialog/>
                        </Flex>
                        <For each={users}>
                            {(user) => (
                                <Card.Root key={user.id}>
                                    <Card.Body p={4}>
                                        <Flex justify="space-between" align="start">
                                            <Stack gap={2}>
                                                <Text fontWeight="medium">{user.name}</Text>
                                                <Text fontSize="sm" color="fg.muted">{user.email}</Text>
                                                <Badge
                                                    variant="subtle"
                                                    colorPalette={user.role === "ADMIN" ? "blue" : "gray"}
                                                >
                                                    {user.role ?? "USER"}
                                                </Badge>
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
                                        <Table.ColumnHeader>Name</Table.ColumnHeader>
                                        <Table.ColumnHeader>Email</Table.ColumnHeader>
                                        <Table.ColumnHeader>Role</Table.ColumnHeader>
                                        <Table.ColumnHeader textAlign="end"></Table.ColumnHeader>
                                    </Table.Row>
                                </Table.Header>
                                <Table.Body>
                                    <For each={users}>
                                        {(user) => (
                                            <Table.Row key={user.id}>
                                                <Table.Cell fontWeight="medium">{user.name}</Table.Cell>
                                                <Table.Cell color="fg.muted">{user.email}</Table.Cell>
                                                <Table.Cell>
                                                    <Badge
                                                        variant="subtle"
                                                        colorPalette={user.role === "ADMIN" ? "blue" : "gray"}
                                                    >
                                                        {user.role ?? "USER"}
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
        </Stack>
    );
}


