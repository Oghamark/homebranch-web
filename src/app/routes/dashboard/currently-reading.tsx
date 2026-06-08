import type {Route} from "./+types/currently-reading";
import {Button, Flex, Heading, Stack} from "@chakra-ui/react";
import {Link} from "react-router";
import {useMemo} from "react";
import {useGetBooksByIdsQuery} from "@/entities/book";
import {BookGridSkeletons, LibraryPage} from "@/pages/library";
import {
    LibraryDisplayOptions,
    LibraryDisplayToggleButton,
    setDisplayMode,
    useLibraryDisplayMode,
    useLibrarySearch
} from "@/features/library";
import {LuBookOpen} from "react-icons/lu";
import {getStoredProgress, ReadingProgressBadge, StorageIndicator, useStorageLocations} from "@/features/reader";
import {useAppDispatch} from "@/app/hooks";
import {useMobileNavConfig} from "@/components/navigation/MobileNavContext";

export function meta({}: Route.MetaArgs) {
    return [
        {title: "Homebranch - Currently Reading"},
        {name: "description", content: "Currently reading books"},
    ];
}

export default function CurrentlyReading() {
    const dispatch = useAppDispatch();
    const displayMode = useLibraryDisplayMode();
    const ids = useMemo(() => {
        const currentlyReading = JSON.parse(
            localStorage.getItem(`currentlyReading_${sessionStorage.getItem("user_id")}`) ?? "{}"
        );
        return Object.keys(currentlyReading ?? {});
    }, []);

    const progressMap = useMemo(() => {
        const userId = sessionStorage.getItem("user_id");
        if (!userId) return {} as Record<string, number>;
        return ids.reduce((acc, id) => {
            const progress = getStoredProgress(userId, id);
            if (progress !== undefined) acc[id] = progress;
            return acc;
        }, {} as Record<string, number>);
    }, [ids]);

    const {locations, allBookIds} = useStorageLocations(ids);

    const query = useLibrarySearch()
    const {data: books, isLoading} = useGetBooksByIdsQuery({bookIds: allBookIds, query: query}, {skip: allBookIds.length === 0});
    const mobileNavRightAction = useMemo(() => (
        <LibraryDisplayToggleButton
            displayMode={displayMode}
            onDisplayModeChange={(mode) => dispatch(setDisplayMode(mode))}
        />
    ), [displayMode, dispatch]);

    useMobileNavConfig(
        "Currently Reading",
        mobileNavRightAction
    );

    if (!isLoading && (!books || books.length === 0)) {
        return _noBooks();
    }

    return (
        <Stack gap={4}>
            <Flex align="center" gap={3} display={{base: "none", md: "flex"}} justify="space-between">
                <Flex align="center" gap={3}>
                    <LuBookOpen size={24}/>
                    <Heading size="2xl">Currently Reading</Heading>
                </Flex>
                <LibraryDisplayOptions
                    displayMode={displayMode}
                    onDisplayModeChange={(mode) => dispatch(setDisplayMode(mode))}
                />
            </Flex>
            {isLoading
                ? <BookGridSkeletons count={ids.length || 6} displayMode={displayMode}/>
                : <LibraryPage
                    books={books!}
                    fetchMore={() => {}}
                    hasMore={false}
                    displayMode={displayMode}
                    getBookBadge={(book) => (
                        <>
                            {locations[book.id] && (
                                <StorageIndicator location={locations[book.id]}/>
                            )}
                            {progressMap[book.id] !== undefined && (
                                <ReadingProgressBadge percentage={progressMap[book.id]}/>
                            )}
                        </>
                    )}
                />
            }
        </Stack>
    );
}

function _noBooks() {
    return (
        <Stack
            height={"100%"}
            alignItems={"center"}
            justifyContent={"center"}
            gap={4}
        >
            <Heading>You don't have any open books!</Heading>
            <Heading size={"md"}>Start reading something new!</Heading>
            <Link to={"/"}>
                <Button>Go to Library</Button>
            </Link>
        </Stack>
    );
}
