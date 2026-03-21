import type {Route} from "./+types/library-management";
import {
    Badge,
    Box,
    Button,
    Card,
    Checkbox,
    Flex,
    For,
    Heading,
    Input,
    Loader,
    NativeSelect,
    Separator,
    Stack,
    Tabs,
    Text,
} from "@chakra-ui/react";
import {
    LuChevronLeft,
    LuChevronRight,
    LuCopy,
    LuFolderSync,
    LuPlay,
    LuRefreshCw,
    LuSettings,
    LuUserCheck
} from "react-icons/lu";
import {
    useBulkAssignBookOwnerMutation,
    useGetAdminBooksQuery,
    useGetJobsQuery,
    useGetLibrarySettingQuery,
    useGetOrphanedBooksMutation,
    useGetUnownedBooksQuery,
    useTriggerLibraryScanMutation,
    useUpsertLibrarySettingMutation,
} from "@/entities/job";
import type {UserModel} from "@/entities/user";
import {useGetUsersQuery} from "@/entities/user";
import {JobRow} from "@/entities/job/ui/JobRow";
import {useCallback, useEffect, useMemo, useState} from "react";
import ToastFactory from "@/app/utils/toast_handler";
import {handleRtkError} from "@/shared/api/rtk-query";
import type {BookDuplicateWithBooksModel, BookModel, ResolveDuplicateAction} from "@/entities/book";
import {useListDuplicatesQuery, useResolveDuplicateMutation, useTriggerDuplicateScanMutation,} from "@/entities/book";
import {useJobStream} from "@/shared";

export function meta({}: Route.MetaArgs) {
    return [
        {title: "Homebranch - Library Management"},
    ];
}

const JOBS_PER_PAGE = 15;
const BOOKS_PER_PAGE = 20;

const statusFilters: { value: string; label: string }[] = [
    {value: "all", label: "All"},
    {value: "active", label: "Running"},
    {value: "waiting", label: "Queued"},
    {value: "completed", label: "Completed"},
    {value: "failed", label: "Failed"},
];

// ---- Shared sub-components ----

function BookTableHeader({
                             allSelected,
                             someSelected,
                             onToggleAll,
                             showOwner,
                         }: {
    allSelected: boolean;
    someSelected: boolean;
    onToggleAll: () => void;
    showOwner?: boolean;
}) {
    return (
        <Flex
            gap={3}
            align="center"
            px={3}
            py={2}
            borderRadius="md"
            bg="bg.subtle"
            fontSize="xs"
            fontWeight="semibold"
            color="fg.muted"
            textTransform="uppercase"
        >
            <Checkbox.Root
                size="sm"
                checked={allSelected ? true : someSelected ? "indeterminate" : false}
                onCheckedChange={onToggleAll}
            >
                <Checkbox.HiddenInput/>
                <Checkbox.Control/>
            </Checkbox.Root>
            <Text flex={2}>Title</Text>
            <Text flex={1} display={{base: "none", md: "block"}}>Author</Text>
            {showOwner && <Text flex={1} display={{base: "none", lg: "block"}}>Owner</Text>}
            {!showOwner && <Text flex={1} display={{base: "none", lg: "block"}}>Filename</Text>}
        </Flex>
    );
}

function BookRow({
                     book,
                     selected,
                     onToggle,
                     ownerLabel,
                 }: {
    book: BookModel;
    selected: boolean;
    onToggle: () => void;
    ownerLabel?: string;
}) {
    return (
        <Flex
            gap={3}
            align="center"
            px={3}
            py={2.5}
            borderRadius="md"
            _hover={{bg: "bg.subtle"}}
            cursor="pointer"
            onClick={onToggle}
        >
            <Checkbox.Root
                size="sm"
                checked={selected}
                onCheckedChange={onToggle}
                onClick={(e) => e.stopPropagation()}
            >
                <Checkbox.HiddenInput/>
                <Checkbox.Control/>
            </Checkbox.Root>
            <Text flex={2} fontSize="sm" fontWeight="medium" truncate>{book.title}</Text>
            <Text flex={1} fontSize="sm" color="fg.muted" truncate
                  display={{base: "none", md: "block"}}>{book.author}</Text>
            {ownerLabel !== undefined ? (
                <Text flex={1} fontSize="xs" color="fg.muted" truncate
                      display={{base: "none", lg: "block"}}>{ownerLabel}</Text>
            ) : (
                <Text flex={1} fontSize="xs" color="fg.muted" truncate
                      display={{base: "none", lg: "block"}}>{book.fileName}</Text>
            )}
        </Flex>
    );
}

function BulkActionBar({
                           selectedCount,
                           users,
                           assignToUserId,
                           onAssignUserChange,
                           onAssign,
                           isAssigning,
                       }: {
    selectedCount: number;
    users: UserModel[];
    assignToUserId: string;
    onAssignUserChange: (id: string) => void;
    onAssign: () => void;
    isAssigning: boolean;
}) {
    if (selectedCount === 0) return null;
    return (
        <Flex gap={3} align="center" p={3} bg="bg.subtle" borderRadius="md" wrap="wrap">
            <Text fontSize="sm" fontWeight="medium">
                {selectedCount} book{selectedCount !== 1 ? "s" : ""} selected
            </Text>
            <Flex gap={2} align="center" flex={1} wrap="wrap">
                <NativeSelect.Root size="sm" w={{base: "full", sm: "xs"}}>
                    <NativeSelect.Field
                        value={assignToUserId}
                        onChange={(e) => onAssignUserChange(e.target.value)}
                    >
                        <option value="">— Select user —</option>
                        {users.map((u) => (
                            <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                        ))}
                    </NativeSelect.Field>
                    <NativeSelect.Indicator/>
                </NativeSelect.Root>
                <Button size="sm" disabled={!assignToUserId} onClick={onAssign} loading={isAssigning}>
                    Assign
                </Button>
            </Flex>
        </Flex>
    );
}

function PaginationControls({
                                page,
                                total,
                                perPage,
                                onPrev,
                                onNext,
                            }: {
    page: number;
    total: number;
    perPage: number;
    onPrev: () => void;
    onNext: () => void;
}) {
    const totalPages = Math.max(1, Math.ceil(total / perPage));
    return (
        <Flex justify="space-between" align="center" pt={2}>
            <Text fontSize="xs" color="fg.muted">
                Page {page + 1} of {totalPages} ({total} total)
            </Text>
            <Flex gap={2}>
                <Button size="xs" variant="outline" onClick={onPrev} disabled={page === 0}>
                    <LuChevronLeft/>
                </Button>
                <Button size="xs" variant="outline" onClick={onNext} disabled={(page + 1) * perPage >= total}>
                    <LuChevronRight/>
                </Button>
            </Flex>
        </Flex>
    );
}

// ---- Duplicate pair sub-component ----

function DuplicatePairCard({
                               item,
                               onResolve,
                               isResolving,
                           }: {
    item: BookDuplicateWithBooksModel;
    onResolve: (action: ResolveDuplicateAction) => void;
    isResolving: boolean;
}) {
    const {suspectBook, originalBook} = item;

    return (
        <Box borderWidth="1px" borderRadius="md" p={4}>
            <Flex gap={4} direction={{base: "column", md: "row"}} align="flex-start">
                {/* Suspect book */}
                <Stack flex={1} gap={1}>
                    <Text fontSize="xs" fontWeight="semibold" textTransform="uppercase" color="orange.500">
                        New Upload
                    </Text>
                    <Text fontWeight="medium" fontSize="sm" truncate>{suspectBook.title}</Text>
                    <Text fontSize="xs" color="fg.muted">{suspectBook.author}</Text>
                    {suspectBook.isbn && (
                        <Text fontSize="xs" color="fg.muted">ISBN: {suspectBook.isbn}</Text>
                    )}
                </Stack>

                <Flex align="center" px={2} color="fg.muted" display={{base: "none", md: "flex"}}>
                    <LuCopy size={14}/>
                </Flex>

                {/* Original book */}
                <Stack flex={1} gap={1}>
                    <Text fontSize="xs" fontWeight="semibold" textTransform="uppercase" color="blue.500">
                        Existing Book
                    </Text>
                    <Text fontWeight="medium" fontSize="sm" truncate>{originalBook.title}</Text>
                    <Text fontSize="xs" color="fg.muted">{originalBook.author}</Text>
                    {originalBook.isbn && (
                        <Text fontSize="xs" color="fg.muted">ISBN: {originalBook.isbn}</Text>
                    )}
                </Stack>

                {/* Actions */}
                <Flex gap={2} direction="column" align="stretch" minW="120px">
                    <Button
                        size="xs"
                        colorPalette="blue"
                        variant="outline"
                        onClick={() => onResolve('merge')}
                        loading={isResolving}
                        title="Keep existing book, delete the new upload"
                    >
                        Keep Existing
                    </Button>
                    <Button
                        size="xs"
                        colorPalette="orange"
                        variant="outline"
                        onClick={() => onResolve('replace')}
                        loading={isResolving}
                        title="Keep the new upload, delete the existing book"
                    >
                        Use New
                    </Button>
                    <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => onResolve('keep_both')}
                        loading={isResolving}
                        title="Keep both books as separate entries"
                    >
                        Keep Both
                    </Button>
                </Flex>
            </Flex>
        </Box>
    );
}

// ---- Main page ----

export default function LibraryManagement() {
    const userRole = sessionStorage.getItem("user_role") ?? "USER";
    const isAdmin = userRole === "ADMIN";

    // Users list — needed by admin sections
    const {data: users = []} = useGetUsersQuery(undefined, {skip: !isAdmin});
    const userMap = useMemo(() => {
        const map: Record<string, UserModel> = {};
        for (const u of users) map[u.id] = u;
        return map;
    }, [users]);

    // Jobs section
    const [statusFilter, setStatusFilter] = useState("all");
    const [jobPage, setJobPage] = useState(0);
    const jobOffset = jobPage * JOBS_PER_PAGE;
    const jobQueryParams = statusFilter === "all"
        ? {limit: JOBS_PER_PAGE, offset: jobOffset}
        : {status: statusFilter, limit: JOBS_PER_PAGE, offset: jobOffset};
    const {data: jobsData, isLoading: isLoadingJobs, isFetching: isFetchingJobs} = useGetJobsQuery(jobQueryParams);
    useJobStream();
    const [triggerScan, {isLoading: isScanTriggering}] = useTriggerLibraryScanMutation();

    const jobs = jobsData?.data ?? [];
    const jobsTotal = jobsData?.total ?? 0;
    const activeCount = jobs.filter((j) => j.status === "active" || j.status === "waiting").length;

    // Reset job page when filter changes
    useEffect(() => {
        setJobPage(0);
    }, [statusFilter]);

    // Default scan user setting (admin only)
    const {data: defaultScanUserSetting} = useGetLibrarySettingQuery("default_scan_user_id", {skip: !isAdmin});
    const [upsertSetting, {isLoading: isSavingSetting}] = useUpsertLibrarySettingMutation();
    const [selectedDefaultUser, setSelectedDefaultUser] = useState<string>("");
    const defaultScanUserId = defaultScanUserSetting?.value ?? "";
    const effectiveDefaultUser = selectedDefaultUser !== "" ? selectedDefaultUser : defaultScanUserId;

    async function handleSaveDefaultUser() {
        try {
            await upsertSetting({key: "default_scan_user_id", value: effectiveDefaultUser}).unwrap();
            ToastFactory({message: "Default scan user saved", type: "success"});
        } catch (error) {
            handleRtkError(error);
        }
    }

    // Duplicates section (admin only)
    const [duplicatesPage, setDuplicatesPage] = useState(0);
    const {data: duplicatesData, isLoading: isLoadingDuplicates} = useListDuplicatesQuery(
        {limit: BOOKS_PER_PAGE, offset: duplicatesPage * BOOKS_PER_PAGE},
        {skip: !isAdmin},
    );
    const [triggerDuplicateScan, {isLoading: isDuplicateScanTriggering}] = useTriggerDuplicateScanMutation();
    const [resolveDuplicate, {isLoading: isResolvingAny}] = useResolveDuplicateMutation();
    const [resolvingId, setResolvingId] = useState<string | null>(null);
    const duplicates = duplicatesData?.data ?? [];
    const duplicatesTotal = duplicatesData?.total ?? 0;

    async function handleTriggerDuplicateScan() {
        try {
            await triggerDuplicateScan().unwrap();
            ToastFactory({message: "Duplicate scan enqueued", type: "success"});
        } catch (error) {
            handleRtkError(error);
        }
    }

    async function handleResolveDuplicate(id: string, action: ResolveDuplicateAction) {
        setResolvingId(id);
        try {
            await resolveDuplicate({id, action}).unwrap();
            const label = action === 'merge' ? 'Kept existing book' : action === 'replace' ? 'Replaced with new upload' : 'Kept both books';
            ToastFactory({message: label, type: "success"});
        } catch (error) {
            handleRtkError(error);
        } finally {
            setResolvingId(null);
        }
    }

    // Book assignment tabs
    const [assignTab, setAssignTab] = useState("unowned");
    const [unownedPage, setUnownedPage] = useState(0);
    const [orphanedPage, setOrphanedPage] = useState(0);
    const [allBooksPage, setAllBooksPage] = useState(0);
    const [allBooksSearch, setAllBooksSearch] = useState("");
    const [allBooksSearchDebounced, setAllBooksSearchDebounced] = useState("");

    // Debounce search input
    useEffect(() => {
        const t = setTimeout(() => setAllBooksSearchDebounced(allBooksSearch), 400);
        return () => clearTimeout(t);
    }, [allBooksSearch]);

    // Reset page when search changes
    useEffect(() => {
        setAllBooksPage(0);
    }, [allBooksSearchDebounced]);

    // Reset selections when tab changes
    const [selectedBookIds, setSelectedBookIds] = useState<Set<string>>(new Set());
    const [assignToUserId, setAssignToUserId] = useState<string>("");
    useEffect(() => {
        setSelectedBookIds(new Set());
        setAssignToUserId("");
    }, [assignTab, unownedPage, orphanedPage, allBooksPage]);

    const [bulkAssign, {isLoading: isAssigning}] = useBulkAssignBookOwnerMutation();

    // Unowned books
    const {data: unownedData, isLoading: isLoadingUnowned} = useGetUnownedBooksQuery(
        {limit: BOOKS_PER_PAGE, offset: unownedPage * BOOKS_PER_PAGE},
        {skip: !isAdmin || assignTab !== "unowned", pollingInterval: 15000},
    );
    const unownedBooks = unownedData?.data ?? [];
    const unownedTotal = unownedData?.total ?? 0;

    // Orphaned books
    const knownUserIds = useMemo(() => users.map((u) => u.id), [users]);
    const [fetchOrphaned, {data: orphanedData, isLoading: isLoadingOrphaned}] = useGetOrphanedBooksMutation();
    useEffect(() => {
        if (!isAdmin || assignTab !== "orphaned") return;
        fetchOrphaned({knownUserIds, limit: BOOKS_PER_PAGE, offset: orphanedPage * BOOKS_PER_PAGE});
    }, [isAdmin, assignTab, orphanedPage, knownUserIds, fetchOrphaned]);
    const orphanedBooks = orphanedData?.data ?? [];
    const orphanedTotal = orphanedData?.total ?? 0;

    // All books
    const {data: allBooksData, isLoading: isLoadingAllBooks} = useGetAdminBooksQuery(
        {limit: BOOKS_PER_PAGE, offset: allBooksPage * BOOKS_PER_PAGE, query: allBooksSearchDebounced || undefined},
        {skip: !isAdmin || assignTab !== "all"},
    );
    const allBooks = allBooksData?.data ?? [];
    const allBooksTotal = allBooksData?.total ?? 0;

    // Current tab's book list
    const currentBooks: BookModel[] = assignTab === "unowned" ? unownedBooks : assignTab === "orphaned" ? orphanedBooks : allBooks;
    const allSelected = currentBooks.length > 0 && selectedBookIds.size === currentBooks.length;
    const someSelected = selectedBookIds.size > 0 && selectedBookIds.size < currentBooks.length;

    const toggleBook = useCallback((id: string) => {
        setSelectedBookIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    function toggleAll() {
        if (allSelected) {
            setSelectedBookIds(new Set());
        } else {
            setSelectedBookIds(new Set(currentBooks.map((b) => b.id)));
        }
    }

    function ownerLabel(book: BookModel): string {
        if (!book.uploadedByUserId) return "—";
        const u = userMap[book.uploadedByUserId];
        if (u) return `${u.name} (${u.email})`;
        return `Deleted user (${book.uploadedByUserId.slice(0, 8)}…)`;
    }

    async function handleBulkAssign() {
        if (selectedBookIds.size === 0 || !assignToUserId) return;
        try {
            const result = await bulkAssign({
                bookIds: Array.from(selectedBookIds),
                userId: assignToUserId,
            }).unwrap();
            ToastFactory({
                message: `Assigned ${result.assigned} book${result.assigned !== 1 ? "s" : ""}${result.failed > 0 ? `, ${result.failed} failed` : ""}`,
                type: result.failed > 0 ? "warning" : "success",
            });
            setSelectedBookIds(new Set());
            setAssignToUserId("");
        } catch (error) {
            handleRtkError(error);
        }
    }

    const isLoadingCurrentTab =
        (assignTab === "unowned" && isLoadingUnowned) ||
        (assignTab === "orphaned" && isLoadingOrphaned) ||
        (assignTab === "all" && isLoadingAllBooks);

    const currentTotal = assignTab === "unowned" ? unownedTotal : assignTab === "orphaned" ? orphanedTotal : allBooksTotal;
    const currentPage = assignTab === "unowned" ? unownedPage : assignTab === "orphaned" ? orphanedPage : allBooksPage;

    function setCurrentPage(p: number) {
        if (assignTab === "unowned") setUnownedPage(p);
        else if (assignTab === "orphaned") setOrphanedPage(p);
        else setAllBooksPage(p);
    }

    return (
        <Stack gap={4}>
            <Flex align="center" gap={3} display={{base: "none", md: "flex"}}>
                <LuFolderSync size={24}/>
                <Heading size="2xl">Library Management</Heading>
            </Flex>

            {/* File Sync card */}
            <Card.Root>
                <Card.Header>
                    <Flex justify="space-between" align="center" wrap="wrap" gap={3}>
                        <Stack gap={0}>
                            <Card.Title>File Sync</Card.Title>
                            <Text fontSize="sm" color="fg.muted">
                                Drop EPUB files into your uploads directory to import them automatically
                            </Text>
                        </Stack>
                        <Button size="sm" onClick={() => triggerScan()} loading={isScanTriggering}>
                            <LuPlay size={14}/>
                            Scan Now
                        </Button>
                    </Flex>
                </Card.Header>
                <Card.Body>
                    <Flex align="center" gap={2}>
                        <Text fontSize="sm" fontWeight="medium">
                            {activeCount > 0 ? `${activeCount} job${activeCount > 1 ? "s" : ""} running` : "Idle"}
                        </Text>
                        {isFetchingJobs && <LuRefreshCw size={12} className="animate-spin"/>}
                    </Flex>
                </Card.Body>
            </Card.Root>

            {/* Admin: Library settings */}
            {isAdmin && (
                <Card.Root>
                    <Card.Header>
                        <Flex align="center" gap={2}>
                            <LuSettings size={16}/>
                            <Card.Title>Library Settings</Card.Title>
                        </Flex>
                    </Card.Header>
                    <Card.Body>
                        <Box>
                            <Text fontSize="sm" fontWeight="medium" mb={1}>Default Owner for Detected Books</Text>
                            <Text fontSize="xs" color="fg.muted" mb={3}>
                                Books detected via file-drop will be assigned to this user automatically.
                                Leave unset to create unowned books.
                            </Text>
                            <Flex gap={3} align="center" wrap="wrap">
                                <NativeSelect.Root size="sm" w={{base: "full", md: "xs"}}>
                                    <NativeSelect.Field
                                        value={effectiveDefaultUser}
                                        onChange={(e) => setSelectedDefaultUser(e.target.value)}
                                    >
                                        <option value="">— No default (unowned) —</option>
                                        {users.map((u) => (
                                            <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                                        ))}
                                    </NativeSelect.Field>
                                    <NativeSelect.Indicator/>
                                </NativeSelect.Root>
                                <Button size="sm" onClick={handleSaveDefaultUser} loading={isSavingSetting}>
                                    Save
                                </Button>
                            </Flex>
                        </Box>
                    </Card.Body>
                </Card.Root>
            )}

            {/* Admin: Book ownership management */}
            {isAdmin && (
                <Card.Root>
                    <Card.Header>
                        <Flex align="center" gap={2}>
                            <LuUserCheck size={16}/>
                            <Card.Title>Book Ownership</Card.Title>
                        </Flex>
                        <Text fontSize="sm" color="fg.muted" mt={1}>
                            Manage book owners. Select books and assign them to a user.
                        </Text>
                    </Card.Header>
                    <Card.Body>
                        <Tabs.Root
                            variant="subtle"
                            value={assignTab}
                            onValueChange={(e) => setAssignTab(e.value)}
                        >
                            <Tabs.List mb={3}>
                                <Tabs.Trigger value="unowned">
                                    Unowned
                                    {unownedTotal > 0 && (
                                        <Badge ml={2} colorPalette="orange" size="sm">{unownedTotal}</Badge>
                                    )}
                                </Tabs.Trigger>
                                <Tabs.Trigger value="orphaned">
                                    Orphaned
                                    {orphanedTotal > 0 && (
                                        <Badge ml={2} colorPalette="red" size="sm">{orphanedTotal}</Badge>
                                    )}
                                </Tabs.Trigger>
                                <Tabs.Trigger value="all">All Books</Tabs.Trigger>
                            </Tabs.List>

                            <Tabs.Content value="unowned">
                                <Text fontSize="xs" color="fg.muted" mb={3}>
                                    Books with no assigned owner ({unownedTotal} total).
                                </Text>
                            </Tabs.Content>
                            <Tabs.Content value="orphaned">
                                <Text fontSize="xs" color="fg.muted" mb={3}>
                                    Books whose owner no longer exists in the system ({orphanedTotal} total).
                                </Text>
                            </Tabs.Content>
                            <Tabs.Content value="all">
                                <Input
                                    size="sm"
                                    placeholder="Search by title or author…"
                                    value={allBooksSearch}
                                    onChange={(e) => setAllBooksSearch(e.target.value)}
                                    mb={3}
                                />
                            </Tabs.Content>
                        </Tabs.Root>

                        {isLoadingCurrentTab ? (
                            <Flex justify="center" py={6}><Loader/></Flex>
                        ) : currentBooks.length === 0 ? (
                            <Text color="fg.muted" textAlign="center" py={6} fontSize="sm">
                                {assignTab === "unowned" ? "All books have an assigned owner" :
                                    assignTab === "orphaned" ? "No orphaned books found" :
                                        "No books found"}
                            </Text>
                        ) : (
                            <Stack gap={3}>
                                <BulkActionBar
                                    selectedCount={selectedBookIds.size}
                                    users={users}
                                    assignToUserId={assignToUserId}
                                    onAssignUserChange={setAssignToUserId}
                                    onAssign={handleBulkAssign}
                                    isAssigning={isAssigning}
                                />
                                <BookTableHeader
                                    allSelected={allSelected}
                                    someSelected={someSelected}
                                    onToggleAll={toggleAll}
                                    showOwner={assignTab === "orphaned" || assignTab === "all"}
                                />
                                <Stack gap={0} separator={<Separator/>}>
                                    <For each={currentBooks}>
                                        {(book) => (
                                            <BookRow
                                                key={book.id}
                                                book={book}
                                                selected={selectedBookIds.has(book.id)}
                                                onToggle={() => toggleBook(book.id)}
                                                ownerLabel={
                                                    assignTab === "orphaned" || assignTab === "all"
                                                        ? ownerLabel(book)
                                                        : undefined
                                                }
                                            />
                                        )}
                                    </For>
                                </Stack>
                                <PaginationControls
                                    page={currentPage}
                                    total={currentTotal}
                                    perPage={BOOKS_PER_PAGE}
                                    onPrev={() => setCurrentPage(currentPage - 1)}
                                    onNext={() => setCurrentPage(currentPage + 1)}
                                />
                            </Stack>
                        )}
                    </Card.Body>
                </Card.Root>
            )}

            {/* Admin: Potential Duplicates */}
            {isAdmin && (
                <Card.Root>
                    <Card.Header>
                        <Flex justify="space-between" align="center" wrap="wrap" gap={3}>
                            <Stack gap={0}>
                                <Flex align="center" gap={2}>
                                    <LuCopy size={16}/>
                                    <Card.Title>
                                        Potential Duplicates
                                        {duplicatesTotal > 0 && (
                                            <Badge ml={2} colorPalette="orange" size="sm">{duplicatesTotal}</Badge>
                                        )}
                                    </Card.Title>
                                </Flex>
                                <Text fontSize="sm" color="fg.muted" mt={1}>
                                    Books with the same file content but different metadata. Review and resolve each
                                    pair.
                                </Text>
                            </Stack>
                            <Button
                                size="sm"
                                onClick={handleTriggerDuplicateScan}
                                loading={isDuplicateScanTriggering}
                            >
                                <LuPlay size={14}/>
                                Scan Now
                            </Button>
                        </Flex>
                    </Card.Header>
                    <Card.Body>
                        {isLoadingDuplicates ? (
                            <Flex justify="center" py={6}><Loader/></Flex>
                        ) : duplicates.length === 0 ? (
                            <Text color="fg.muted" textAlign="center" py={6} fontSize="sm">
                                No potential duplicates found
                            </Text>
                        ) : (
                            <Stack gap={3}>
                                <Stack gap={2}>
                                    <For each={duplicates}>
                                        {(item) => (
                                            <DuplicatePairCard
                                                key={item.duplicate.id}
                                                item={item}
                                                onResolve={(action) => handleResolveDuplicate(item.duplicate.id, action)}
                                                isResolving={resolvingId === item.duplicate.id && isResolvingAny}
                                            />
                                        )}
                                    </For>
                                </Stack>
                                <PaginationControls
                                    page={duplicatesPage}
                                    total={duplicatesTotal}
                                    perPage={BOOKS_PER_PAGE}
                                    onPrev={() => setDuplicatesPage((p) => p - 1)}
                                    onNext={() => setDuplicatesPage((p) => p + 1)}
                                />
                            </Stack>
                        )}
                    </Card.Body>
                </Card.Root>
            )}

            {/* Job History */}
            <Card.Root>
                <Card.Header>
                    <Card.Title>Job History</Card.Title>
                </Card.Header>
                <Card.Body>
                    <Tabs.Root
                        variant="subtle"
                        value={statusFilter}
                        onValueChange={(e) => setStatusFilter(e.value)}
                        mb={3}
                    >
                        <Tabs.List>
                            <For each={statusFilters}>
                                {(filter) => (
                                    <Tabs.Trigger key={filter.value} value={filter.value}>
                                        {filter.label}
                                    </Tabs.Trigger>
                                )}
                            </For>
                        </Tabs.List>
                    </Tabs.Root>

                    {isLoadingJobs ? (
                        <Flex justify="center" py={8}><Loader/></Flex>
                    ) : jobs.length === 0 ? (
                        <Text color="fg.muted" textAlign="center" py={8}>No jobs found</Text>
                    ) : (
                        <Stack gap={3}>
                            <Box overflowY="auto" maxH="480px">
                                <Stack gap={0} separator={<Separator/>}>
                                    <For each={jobs}>
                                        {(job) => <JobRow key={job.id} job={job}/>}
                                    </For>
                                </Stack>
                            </Box>
                            <PaginationControls
                                page={jobPage}
                                total={jobsTotal}
                                perPage={JOBS_PER_PAGE}
                                onPrev={() => setJobPage((p) => p - 1)}
                                onNext={() => setJobPage((p) => p + 1)}
                            />
                        </Stack>
                    )}
                </Card.Body>
            </Card.Root>
        </Stack>
    );
}
