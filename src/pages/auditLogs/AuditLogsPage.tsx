import {useId, useState, type FormEvent} from "react";
import {Badge, Box, Button, Flex, Input, NativeSelect, Stack, Table, Text} from "@chakra-ui/react";
import {LuRefreshCw} from "react-icons/lu";
import {useGetAuditLogsQuery, useGetAuthenticationAuditLogsQuery, type AuditLogQuery} from "@/entities/audit/api";
import {EmptyState, ErrorState, LoadingState, PageHeader} from "@/shared/ui/EditorialUI";

const PAGE_SIZE = 25;

export function AuditLogsPage() {
    const formId = useId();
    const isAdmin = sessionStorage.getItem("user_role") === "ADMIN";
    const [source, setSource] = useState("application");
    const [draft, setDraft] = useState({actor: "", action: "", outcome: "", from: "", to: ""});
    const [filters, setFilters] = useState<AuditLogQuery>({limit: PAGE_SIZE, offset: 0});
    const [filterError, setFilterError] = useState("");
    const application = useGetAuditLogsQuery(filters, {skip: !isAdmin || source !== "application"});
    const authentication = useGetAuthenticationAuditLogsQuery(filters, {skip: !isAdmin || source !== "authentication"});
    const {currentData: page, isFetching, isError, refetch} = source === "application" ? application : authentication;

    function applyFilters(event: FormEvent) {
        event.preventDefault();
        if ((draft.from && !Number.isFinite(Date.parse(draft.from))) || (draft.to && !Number.isFinite(Date.parse(draft.to)))) {
            setFilterError("Enter valid start and end dates.");
            return;
        }
        const from = draft.from ? new Date(draft.from).toISOString() : undefined;
        const to = draft.to ? new Date(draft.to).toISOString() : undefined;
        if (from && to && from > to) {
            setFilterError("The start date must not be after the end date.");
            return;
        }
        setFilterError("");
        setFilters({
            limit: PAGE_SIZE, offset: 0,
            actor: draft.actor.trim() || undefined,
            action: draft.action.trim() || undefined,
            outcome: draft.outcome === "success" || draft.outcome === "failure" ? draft.outcome : undefined,
            from, to,
        });
    }

    if (!isAdmin) return <ErrorState>Only administrators can view audit logs.</ErrorState>;

    return <Stack gap={6} minW={0}>
        <PageHeader title="Audit logs" description="User-attributed actions and their outcomes. Logs begin when audit logging is enabled."
            actions={<Button variant="outline" minH="44px" disabled={isFetching} onClick={() => refetch()}><LuRefreshCw/> Refresh logs</Button>}/>
        <Box>
            <Text asChild fontSize="sm"><label htmlFor={`${formId}-source`}>Log source</label></Text>
            <NativeSelect.Root maxW="sm">
                <NativeSelect.Field id={`${formId}-source`} value={source} minH="44px" onChange={event => {
                    setSource(event.target.value);
                    setFilters(previous => ({...previous, offset: 0}));
                }}>
                    <option value="application">Application actions</option>
                    <option value="authentication">Sign-in and account administration</option>
                </NativeSelect.Field>
                <NativeSelect.Indicator/>
            </NativeSelect.Root>
        </Box>
        <Stack as="form" gap={3} onSubmit={applyFilters}>
            <Flex gap={3} wrap="wrap" align="end">
                <Box flex="1" minW="200px">
                    <Text asChild fontSize="sm"><label htmlFor={`${formId}-actor`}>User</label></Text>
                    <Input id={`${formId}-actor`} placeholder="Email or user ID" maxLength={200} value={draft.actor}
                        onChange={event => setDraft({...draft, actor: event.target.value})} minH="44px"/>
                </Box>
                <Box flex="1" minW="200px">
                    <Text asChild fontSize="sm"><label htmlFor={`${formId}-action`}>Action</label></Text>
                    <Input id={`${formId}-action`} placeholder="Method or route, e.g. DELETE" maxLength={200} value={draft.action}
                        onChange={event => setDraft({...draft, action: event.target.value})} minH="44px"/>
                </Box>
                <Box minW="150px">
                    <Text asChild fontSize="sm"><label htmlFor={`${formId}-outcome`}>Outcome</label></Text>
                    <NativeSelect.Root>
                        <NativeSelect.Field id={`${formId}-outcome`} value={draft.outcome} minH="44px"
                            onChange={event => setDraft({...draft, outcome: event.target.value})}>
                            <option value="">All outcomes</option>
                            <option value="success">Success</option>
                            <option value="failure">Failure</option>
                        </NativeSelect.Field>
                        <NativeSelect.Indicator/>
                    </NativeSelect.Root>
                </Box>
                {(["from", "to"] as const).map(key => <Box key={key}>
                    <Text asChild fontSize="sm"><label htmlFor={`${formId}-${key}`}>{key === "from" ? "From" : "To"} (local time)</label></Text>
                    <Input id={`${formId}-${key}`} type="datetime-local" value={draft[key]} minH="44px"
                        onChange={event => setDraft({...draft, [key]: event.target.value})}/>
                </Box>)}
                <Button type="submit" variant="outline" minH="44px">Apply filters</Button>
            </Flex>
            {filterError && <Text role="alert" color="fg.error">{filterError}</Text>}
        </Stack>
        {isError ? <ErrorState onRetry={refetch}>Audit logs could not be loaded. Check your connection and administrator access.</ErrorState>
            : !page ? <LoadingState label="Loading audit logs..."/>
            : page.data.length === 0 ? <EmptyState title="No audit logs found">Try different filters or perform an action and refresh.</EmptyState>
            : <Box overflowX="auto" borderWidth="1px" borderRadius="xl" aria-busy={isFetching}>
                <Table.Root>
                    <Table.Header><Table.Row>
                        {["Time", "User", "Action", "Resources", "Outcome"].map(label => <Table.ColumnHeader key={label}>{label}</Table.ColumnHeader>)}
                    </Table.Row></Table.Header>
                    <Table.Body>{page.data.map(entry => <Table.Row key={entry.id}>
                        <Table.Cell whiteSpace="nowrap"><time dateTime={entry.createdAt}>{new Date(entry.createdAt).toLocaleString()}</time></Table.Cell>
                        <Table.Cell>
                            <Text overflowWrap="anywhere">{entry.actorLabel ?? (entry.actorId ? "User" : "Unauthenticated or service request")}</Text>
                            {entry.actorId && <Text fontSize="xs" color="fg.muted" overflowWrap="anywhere">{entry.actorId}</Text>}
                        </Table.Cell>
                        <Table.Cell><Text fontFamily="mono" fontSize="sm" overflowWrap="anywhere">{entry.method} {entry.route}</Text></Table.Cell>
                        <Table.Cell>{Object.entries(entry.resourceIds).length
                            ? Object.entries(entry.resourceIds).map(([key, value]) => <Text key={key} fontSize="xs" overflowWrap="anywhere">{key}: {value}</Text>)
                            : <Text color="fg.muted">None</Text>}</Table.Cell>
                        <Table.Cell><Badge colorPalette={entry.outcome === "success" ? "green" : "red"}>
                            {entry.outcome === "success" ? "Success" : "Failure"} ({entry.statusCode})
                        </Badge></Table.Cell>
                    </Table.Row>)}</Table.Body>
                </Table.Root>
            </Box>}
        {page && !isError && <Flex gap={3} wrap="wrap" align="center" justify="space-between">
            <Text fontSize="sm" color="fg.muted" role="status">
                {page.total === 0 ? "0 entries" : `${page.offset + 1}-${page.offset + page.data.length} of ${page.total} entries`}
            </Text>
            <Flex gap={2}>
                <Button variant="outline" minH="44px" disabled={isFetching || filters.offset === 0}
                    onClick={() => setFilters(previous => ({...previous, offset: Math.max(0, previous.offset - PAGE_SIZE)}))}>Previous</Button>
                <Button variant="outline" minH="44px" disabled={isFetching || page.offset + page.data.length >= page.total}
                    onClick={() => setFilters(previous => ({...previous, offset: previous.offset + PAGE_SIZE}))}>Next</Button>
            </Flex>
        </Flex>}
    </Stack>;
}
