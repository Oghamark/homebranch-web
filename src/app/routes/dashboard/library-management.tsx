import type {Route} from "./+types/library-management";
import {Button, Flex, Input, NativeSelect, Separator, Stack, Text} from "@chakra-ui/react";
import {useEffect, useMemo, useState} from "react";
import {redirect} from "react-router";
import {
    useBulkAssignBookOwnerMutation, useGetAdminBooksQuery, useGetJobsQuery, useGetLibrarySettingQuery,
    useGetOrphanedBooksMutation, useGetUnownedBooksQuery, useTriggerLibraryScanMutation, useUpsertLibrarySettingMutation,
} from "@/entities/job";
import {useGetUsersQuery} from "@/entities/user";
import type {BookModel, ResolveDuplicateAction} from "@/entities/book";
import {useListDuplicatesQuery, useResolveDuplicateMutation, useTriggerDuplicateScanMutation} from "@/entities/book";
import {JobRow} from "@/entities/job/ui/JobRow";
import {BulkActionBar, DuplicatePairCard, OwnershipBooks, PaginationControls} from "@/entities/job/ui/AdministrationTools";
import {ConfirmAction, EmptyState, ErrorState, LoadingState, PageHeader, PageSection} from "@/shared/ui/EditorialUI";
import {config, useJobStream} from "@/shared";
import ToastFactory from "@/shared/lib/toast/toast";

export function clientLoader() {
    if (config.cloudMode && sessionStorage.getItem("user_role") !== "ADMIN") return redirect("/");
    return null;
}

export function meta({}: Route.MetaArgs) {
    return [{title: "Homebranch - Library Management"}];
}

const JOBS_PER_PAGE = 15;
const BOOKS_PER_PAGE = 20;
const statusFilters = [
    {value: "all", label: "All jobs"}, {value: "active", label: "Running"},
    {value: "waiting", label: "Queued"}, {value: "completed", label: "Completed"}, {value: "failed", label: "Failed"},
];

export default function LibraryManagement() {
    const isAdmin = sessionStorage.getItem("user_role") === "ADMIN";
    const usersQuery = useGetUsersQuery(undefined, {skip: !isAdmin});
    const users = useMemo(() => usersQuery.data ?? [], [usersQuery.data]);
    const userMap = useMemo(() => new Map(users.map(user => [user.id, user])), [users]);
    const [scanFailure, setScanFailure] = useState("");
    const [duplicateScanFailure, setDuplicateScanFailure] = useState("");
    const [settingFailure, setSettingFailure] = useState("");
    const [assignmentFailure, setAssignmentFailure] = useState("");

    const [statusFilter, setStatusFilter] = useState("all");
    const [jobPage, setJobPage] = useState(0);
    const jobsQuery = useGetJobsQuery({
        ...(statusFilter === "all" ? {} : {status: statusFilter}), limit: JOBS_PER_PAGE, offset: jobPage * JOBS_PER_PAGE,
    });
    useJobStream();
    const [triggerScan, {isLoading: isScanTriggering}] = useTriggerLibraryScanMutation();
    const [triggerDuplicateScan, {isLoading: isDuplicateScanTriggering}] = useTriggerDuplicateScanMutation();
    const defaultQuery = useGetLibrarySettingQuery("default_scan_user_id", {skip: !isAdmin});
    const [upsertSetting, {isLoading: isSavingSetting}] = useUpsertLibrarySettingMutation();
    // Undefined means untouched. An empty string is an intentional "no owner" draft.
    const [defaultDraft, setDefaultDraft] = useState<string | undefined>();
    const defaultOwner = defaultDraft ?? defaultQuery.data?.value ?? "";

    const [duplicatesPage, setDuplicatesPage] = useState(0);
    const duplicatesQuery = useListDuplicatesQuery(
        {limit: BOOKS_PER_PAGE, offset: duplicatesPage * BOOKS_PER_PAGE}, {skip: !isAdmin});
    const [resolveDuplicate, {isLoading: isResolving}] = useResolveDuplicateMutation();
    const [assignTab, setAssignTab] = useState("unowned");
    const [bookPage, setBookPage] = useState(0);
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [selectedBookIds, setSelectedBookIds] = useState<Set<string>>(new Set());
    const [assignToUserId, setAssignToUserId] = useState("");
    const [bulkAssign, {isLoading: isAssigning}] = useBulkAssignBookOwnerMutation();
    const clearSelection = () => {setSelectedBookIds(new Set()); setAssignToUserId(""); setAssignmentFailure("");};
    useEffect(() => {
        const timer = setTimeout(() => {setDebouncedSearch(search); setBookPage(0);}, 400);
        return () => clearTimeout(timer);
    }, [search]);
    useEffect(() => {setSelectedBookIds(new Set()); setAssignToUserId(""); setAssignmentFailure("");},
        [assignTab, bookPage, search]);

    const params = {limit: BOOKS_PER_PAGE, offset: bookPage * BOOKS_PER_PAGE};
    const unownedQuery = useGetUnownedBooksQuery(params, {skip: !isAdmin || assignTab !== "unowned", pollingInterval: 15000});
    const allBooksQuery = useGetAdminBooksQuery({...params, query: debouncedSearch || undefined},
        {skip: !isAdmin || assignTab !== "all"});
    const knownUserIds = useMemo(() => users.map(user => user.id), [users]);
    const [fetchOrphaned, orphanedQuery] = useGetOrphanedBooksMutation();
    useEffect(() => {
        if (isAdmin && assignTab === "orphaned" && usersQuery.isSuccess && !usersQuery.isError)
            fetchOrphaned({knownUserIds, limit: BOOKS_PER_PAGE, offset: bookPage * BOOKS_PER_PAGE});
    }, [isAdmin, assignTab, knownUserIds, bookPage, fetchOrphaned, usersQuery.isSuccess, usersQuery.isError]);
    const currentQuery = assignTab === "unowned" ? unownedQuery : assignTab === "all" ? allBooksQuery : orphanedQuery;
    // Query data must belong to the visible page/filter, not RTK Query's previous arguments.
    const orphanedMatches = orphanedQuery.originalArgs?.offset === params.offset &&
        JSON.stringify(orphanedQuery.originalArgs?.knownUserIds) === JSON.stringify(knownUserIds);
    const currentData = assignTab === "unowned" ? unownedQuery.currentData
        : assignTab === "all" ? allBooksQuery.currentData : orphanedMatches ? orphanedQuery.data : undefined;
    const books = currentData?.data ?? [];
    const visibleIds = books.map(book => book.id);
    const scopedSelection = new Set([...selectedBookIds].filter(id => visibleIds.includes(id)));
    const searchPending = assignTab === "all" && search !== debouncedSearch;
    const loadingBooks = currentQuery.isLoading || searchPending || (!currentData && !currentQuery.isError);
    const selectedUsersUnavailable = usersQuery.isLoading || usersQuery.isError;
    const defaultUser = users.find(user => user.id === defaultOwner);

    function ownerLabel(book: BookModel) {
        if (!book.uploadedByUserId) return "Unowned";
        const user = userMap.get(book.uploadedByUserId);
        return user ? `${user.name} (${user.email})` : `Deleted user (${book.uploadedByUserId.slice(0, 8)})`;
    }

    async function handleBulkAssign() {
        if (!scopedSelection.size || !userMap.has(assignToUserId)) return false;
        setAssignmentFailure("");
        const result = await bulkAssign({bookIds: [...scopedSelection], userId: assignToUserId}).unwrap();
        if (result.failed > 0) {
            setAssignmentFailure(`${result.assigned} assigned; ${result.failed} could not be assigned. Review this page before retrying. Your selection is kept where the books are still visible.`);
            return false;
        }
        ToastFactory({message: `Assigned ${result.assigned} books`, type: "success"});
        clearSelection();
        if (assignTab === "orphaned") await fetchOrphaned({knownUserIds, ...params});
    }

    async function handleResolveDuplicate(id: string, action: ResolveDuplicateAction) {
        await resolveDuplicate({id, action}).unwrap();
        ToastFactory({message: "Duplicate resolved", type: "success"});
    }

    async function scan(duplicates = false) {
        const setFailure = duplicates ? setDuplicateScanFailure : setScanFailure;
        setFailure("");
        try {
            if (duplicates) await triggerDuplicateScan().unwrap();
            else await triggerScan().unwrap();
            ToastFactory({message: duplicates ? "Duplicate scan queued" : "Library scan queued", type: "success"});
        } catch {
            setFailure("The scan could not be started. Check your connection and permissions, then try again.");
        }
    }

    return <Stack gap={8} minW={0}>
        <PageHeader title="Library management" description="Import files, manage book ownership, and follow background work."/>
        <Flex as="nav" aria-label="Library management sections" gap={2} wrap="wrap">
            {[["sync", "File sync"], ...(isAdmin ? [["ownership", "Book ownership"], ["duplicates", "Duplicates"]] : []),
                ["jobs", "Job history"]].map(([id, label]) =>
                <Button key={id} asChild variant="outline" minH="44px"><a href={`#${id}`}>{label}</a></Button>)}
        </Flex>
        <PageSection id="sync" title="File sync and defaults"
            description="Drop EPUB files into your uploads directory to import them automatically."
            actions={<Button colorPalette="orange" minH="44px" onClick={() => scan()} loading={isScanTriggering} loadingText="Scan files now">Scan files now</Button>}>
            {scanFailure && <ErrorState onRetry={() => scan()}>{scanFailure}</ErrorState>}
            <Text color="fg.muted">Scans run in the background. Follow queued, running, and finished work in Job history below.</Text>
            {isAdmin && <Stack gap={3} p={4} borderWidth="1px" borderRadius="xl">
                <Text fontWeight="semibold">Default owner for detected books</Text>
                <Text color="fg.muted" fontSize="sm">New file imports use this owner. Choose no default to create unowned books. Existing ownership is unchanged.</Text>
                {defaultQuery.isLoading ? <LoadingState label="Loading the default owner..."/> : defaultQuery.isError ?
                    <ErrorState onRetry={defaultQuery.refetch}>The saved default owner could not be loaded. Try again before changing it.</ErrorState> :
                    <Flex gap={3} wrap="wrap">
                        <NativeSelect.Root w={{base: "full", md: "sm"}} disabled={selectedUsersUnavailable || isSavingSetting}>
                            <NativeSelect.Field aria-label="Default owner for detected books" minH="44px" value={defaultOwner}
                                onChange={event => setDefaultDraft(event.target.value)}>
                                <option value="">No default owner (unowned)</option>
                                {defaultOwner && !defaultUser && <option value={defaultOwner}>Previously selected owner (unavailable)</option>}
                                {users.map(user => <option key={user.id} value={user.id}>{user.name} ({user.email})</option>)}
                            </NativeSelect.Field><NativeSelect.Indicator/>
                        </NativeSelect.Root>
                        <ConfirmAction title="Change the default import owner?"
                            description={`Future detected books will be ${defaultUser ? `owned by ${defaultUser.name} (${defaultUser.email})` : "unowned"}. Existing books are unchanged.`}
                            actionLabel="Save default owner" disabled={isSavingSetting || selectedUsersUnavailable || defaultDraft === undefined || (!!defaultOwner && !defaultUser)}
                            errorText={settingFailure || "The default owner could not be saved. Your draft is kept. Please try again."}
                            onConfirm={async () => {
                                try {
                                    await upsertSetting({key: "default_scan_user_id", value: defaultOwner}).unwrap();
                                    setDefaultDraft(undefined); setSettingFailure("");
                                    ToastFactory({message: "Default owner saved", type: "success"});
                                } catch {
                                    setSettingFailure("The default owner could not be saved. Your draft is kept. Please try again.");
                                    return false;
                                }
                            }}/>
                    </Flex>}
            </Stack>}
        </PageSection>
        {isAdmin && usersQuery.isError && <ErrorState onRetry={usersQuery.refetch}>
            User accounts could not be loaded. Owner selection and deleted-owner detection are unavailable until you retry.
        </ErrorState>}
        {isAdmin && <>
            <Separator/>
            <PageSection id="ownership" title="Book ownership" description="Assign unowned books or replace an existing owner. Select only the books you intend to change.">
                <NativeSelect.Root maxW="sm" disabled={isAssigning}>
                    <NativeSelect.Field aria-label="Ownership filter" minH="44px" value={assignTab}
                        onChange={event => {setAssignTab(event.target.value); setBookPage(0); clearSelection();}}>
                        <option value="unowned">Unowned books</option><option value="orphaned">Books with deleted owners</option>
                        <option value="all">All books</option>
                    </NativeSelect.Field><NativeSelect.Indicator/>
                </NativeSelect.Root>
                {assignTab === "all" && <Input minH="44px" aria-label="Search books for ownership" placeholder="Search by title or author"
                    disabled={isAssigning} value={search} onChange={event => {setSearch(event.target.value); clearSelection();}}/>}
                {assignTab === "orphaned" && selectedUsersUnavailable ? usersQuery.isLoading ?
                    <LoadingState label="Loading accounts before checking book owners..."/> :
                    <ErrorState onRetry={usersQuery.refetch}>Load user accounts before checking for deleted owners.</ErrorState> :
                    currentQuery.isError ? <ErrorState onRetry={() => assignTab === "orphaned"
                        ? fetchOrphaned({knownUserIds, ...params}) : assignTab === "all" ? allBooksQuery.refetch() : unownedQuery.refetch()}>
                        Books could not be loaded. Your filters are kept. Please try again.
                    </ErrorState> : loadingBooks ? <LoadingState label="Loading books..."/> : <>
                        <BulkActionBar selectedCount={scopedSelection.size} users={users} userId={assignToUserId}
                            onUserChange={setAssignToUserId} onAssign={handleBulkAssign}
                            disabled={isAssigning || selectedUsersUnavailable} errorText={assignmentFailure || undefined}/>
                        {books.length === 0 ? <EmptyState title={search ? "No matching books" : "No books in this ownership group"}>
                            {search ? "Try another title or author." : "Choose another ownership filter to review other books."}
                        </EmptyState> : <OwnershipBooks books={books} selectedIds={scopedSelection} ownerLabel={ownerLabel}
                            disabled={isAssigning} onToggle={id => setSelectedBookIds(previous => {
                                const next = new Set(previous); if (next.has(id)) next.delete(id); else next.add(id); return next;
                            })}
                            onToggleAll={() => setSelectedBookIds(scopedSelection.size === books.length ? new Set() : new Set(visibleIds))}/>}
                        <PaginationControls page={bookPage} total={currentData?.total ?? 0} perPage={BOOKS_PER_PAGE}
                            onPage={page => {if (!isAssigning) {setBookPage(page); clearSelection();}}}/>
                    </>}
            </PageSection>
            <Separator/>
            <PageSection id="duplicates" title="Potential duplicates" description="Compare matching file content and choose which book to retain."
                actions={<Button colorPalette="orange" minH="44px" onClick={() => scan(true)} loading={isDuplicateScanTriggering} loadingText="Scan for duplicates">Scan for duplicates</Button>}>
                {duplicateScanFailure && <ErrorState onRetry={() => scan(true)}>{duplicateScanFailure}</ErrorState>}
                {duplicatesQuery.isError ? <ErrorState onRetry={duplicatesQuery.refetch}>Potential duplicates could not be loaded.</ErrorState> :
                    duplicatesQuery.isLoading || !duplicatesQuery.currentData ? <LoadingState label="Loading potential duplicates..."/> : <>
                        {duplicatesQuery.currentData.data.length === 0 ? <EmptyState title="No potential duplicates found">
                            Run a scan after importing books to check for matching files.
                        </EmptyState> : duplicatesQuery.currentData.data.map(item => <DuplicatePairCard key={item.duplicate.id}
                            item={item} disabled={isResolving} onResolve={action => handleResolveDuplicate(item.duplicate.id, action)}/>)}
                        <PaginationControls page={duplicatesPage} total={duplicatesQuery.currentData.total ?? 0} perPage={BOOKS_PER_PAGE} onPage={setDuplicatesPage}/>
                    </>}
            </PageSection>
        </>}
        <Separator/>
        <PageSection id="jobs" title="Job history" description="Background work updates automatically while this page is open. Filters apply to the history, not the scan itself.">
            <NativeSelect.Root maxW="sm">
                <NativeSelect.Field aria-label="Job status" minH="44px" value={statusFilter}
                    onChange={event => {setStatusFilter(event.target.value); setJobPage(0);}}>
                    {statusFilters.map(filter => <option key={filter.value} value={filter.value}>{filter.label}</option>)}
                </NativeSelect.Field><NativeSelect.Indicator/>
            </NativeSelect.Root>
            {jobsQuery.isError ? <ErrorState onRetry={jobsQuery.refetch}>Job history could not be loaded. Automatic updates may be interrupted.</ErrorState> :
                jobsQuery.isLoading || !jobsQuery.currentData ? <LoadingState label="Loading job history..."/> : <>
                    {jobsQuery.currentData.data.length === 0 ? <EmptyState title="No jobs in this view">
                        Choose another status or start a file scan.
                    </EmptyState> : <Stack gap={0} separator={<Separator/>}>
                        {jobsQuery.currentData.data.map(job => <JobRow key={job.id} job={job}/>)}
                    </Stack>}
                    <PaginationControls page={jobPage} total={jobsQuery.currentData.total} perPage={JOBS_PER_PAGE} onPage={setJobPage}/>
                </>}
        </PageSection>
    </Stack>;
}
