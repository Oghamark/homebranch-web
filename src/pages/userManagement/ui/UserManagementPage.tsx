import {Badge, Box, Flex, Input, Stack, Table, Text} from "@chakra-ui/react";
import {useState} from "react";
import {CreateUserDialog, useDeleteUserMutation, useGetUsersQuery, type UserModel, useUpdateUserRoleMutation} from "@/entities/user";
import {toaster} from "@/shared/ui/toaster";
import {ConfirmAction, EmptyState, ErrorState, LoadingState, PageHeader} from "@/shared/ui/EditorialUI";

export function UserActions({user}: {user: UserModel}) {
    const [deleteUser, {isLoading: isDeleting}] = useDeleteUserMutation();
    const [updateUserRole, {isLoading: isUpdatingRole}] = useUpdateUserRoleMutation();
    if (user.id === sessionStorage.getItem("user_id")) return <Text fontSize="sm" color="fg.muted">Your account</Text>;

    const nextRole = user.role === "ADMIN" ? "USER" : "ADMIN";
    const roleAction = nextRole === "ADMIN" ? "Make administrator" : "Remove administrator access";
    return <Flex gap={2} wrap="wrap">
        <ConfirmAction title={`${roleAction} for ${user.name}?`}
            description={`${user.name} (${user.email}) ${nextRole === "ADMIN"
                ? "will be able to manage users and library administration."
                : "will lose administrator privileges and keep ordinary user access."}`}
            actionLabel={roleAction} disabled={isUpdatingRole || isDeleting}
            errorText="The role could not be changed. Check your permissions and try again."
            onConfirm={async () => {
                await updateUserRole({id: user.id, role: nextRole}).unwrap();
                toaster.success({description: `Access updated for ${user.name}`});
            }}/>
        <ConfirmAction title={`Delete ${user.name}?`} destructive actionLabel="Delete user"
            description={`Delete the account for ${user.name} (${user.email}). This cannot be undone. Their books may need a new owner in Library management.`}
            disabled={isUpdatingRole || isDeleting} errorText="This user could not be deleted. Check your permissions and try again."
            onConfirm={async () => {
                await deleteUser(user.email).unwrap();
                toaster.success({description: `${user.name} has been deleted`});
            }}/>
    </Flex>;
}

function Role({user}: {user: UserModel}) {
    return <Badge colorPalette={user.role === "ADMIN" ? "orange" : "gray"}>{user.role === "ADMIN" ? "Administrator" : "User"}</Badge>;
}

function providerLabel(provider: string) {
    return ({local: "Password", oidc: "Single sign-on (OIDC)", ldap: "Directory (LDAP)"} as Record<string, string>)[provider.toLowerCase()] ?? provider;
}

export function UserManagementPage() {
    const {data: users = [], isLoading, isError, refetch} = useGetUsersQuery();
    const [search, setSearch] = useState("");
    const filtered = users.filter(user => `${user.name} ${user.email}`.toLowerCase().includes(search.trim().toLowerCase()));
    return <Stack gap={6} minW={0}>
        <PageHeader title="User management" description="Manage accounts and administrator access." actions={<CreateUserDialog/>}/>
        <Input aria-label="Search users" placeholder="Search by name or email" minH="44px" value={search}
            onChange={event => setSearch(event.target.value)} maxW="lg"/>
        {isLoading ? <LoadingState label="Loading users..."/> : isError ? <ErrorState onRetry={refetch}>
            Users could not be loaded. Check your connection and administrator access.
        </ErrorState> : filtered.length === 0 ? <EmptyState title={search ? "No matching users" : "No users found"}>
            {search ? "Try another name or email." : "Create an account to add someone to Homebranch."}
        </EmptyState> : <>
            <Stack display={{base: "flex", lg: "none"}} gap={3}>
                {filtered.map(user => <Stack key={user.id} p={4} borderWidth="1px" borderRadius="xl" gap={3} minW={0}>
                    <Text fontWeight="semibold" overflowWrap="anywhere">{user.name}</Text>
                    <Text color="fg.muted" overflowWrap="anywhere">{user.email}</Text>
                    <Flex gap={2} wrap="wrap"><Role user={user}/><Text fontSize="sm">Sign-in: {providerLabel(user.provider)}</Text></Flex>
                    <UserActions user={user}/>
                </Stack>)}
            </Stack>
            <Box display={{base: "none", lg: "block"}} overflowX="auto" borderWidth="1px" borderRadius="xl">
                <Table.Root>
                    <Table.Header><Table.Row>
                        {["Name", "Email", "Role", "Sign-in", "Actions"].map(label => <Table.ColumnHeader key={label}>{label}</Table.ColumnHeader>)}
                    </Table.Row></Table.Header>
                    <Table.Body>{filtered.map(user => <Table.Row key={user.id}>
                        <Table.Cell fontWeight="medium">{user.name}</Table.Cell><Table.Cell>{user.email}</Table.Cell>
                        <Table.Cell><Role user={user}/></Table.Cell><Table.Cell>{providerLabel(user.provider)}</Table.Cell>
                        <Table.Cell><UserActions user={user}/></Table.Cell>
                    </Table.Row>)}</Table.Body>
                </Table.Root>
            </Box>
        </>}
    </Stack>;
}
