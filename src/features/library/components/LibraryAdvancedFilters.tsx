import {Badge, Button, Field, Flex, Grid, Input, NativeSelect, Popover, Portal, Stack, Text} from "@chakra-ui/react";
import {useState} from "react";
import {LuSlidersHorizontal} from "react-icons/lu";
import {useGetGenresQuery} from "@/entities/book";
import {useLibraryFilters} from "../hooks/useLibraryFilters";

export function LibraryAdvancedFilters() {
    const [open, setOpen] = useState(false);
    const {filters, setFilter, clearFilters, hasFilters} = useLibraryFilters();
    const {data: genres = [], isError, refetch} = useGetGenresQuery();
    const activeCount = [
        filters.genre, filters.yearFrom, filters.yearTo, filters.series, filters.language, filters.publisher,
    ].filter(Boolean).length + (filters.sortBy !== "title" || filters.sortDirection !== "ASC" ? 1 : 0);

    return <Popover.Root open={open} onOpenChange={({open: nextOpen}) => setOpen(nextOpen)}
        positioning={{placement: "bottom-end"}}>
        <Popover.Trigger asChild>
            <Button variant={activeCount ? "outline" : "ghost"} minH="44px" aria-label="Filter and sort books">
                <LuSlidersHorizontal/>
                Filters
                {activeCount > 0 && <Badge colorPalette="orange" variant="subtle">{activeCount}</Badge>}
            </Button>
        </Popover.Trigger>
        <Portal>
            <Popover.Positioner>
                <Popover.Content w={{base: "calc(100vw - 2rem)", sm: "36rem"}} maxW="calc(100vw - 1rem)">
                    <Popover.Header>
                        <Popover.Title>Filter and sort books</Popover.Title>
                    </Popover.Header>
                    <Popover.Body>
                        <Stack gap={4}>
                            <Grid gridTemplateColumns={{base: "repeat(2, minmax(0, 1fr))", sm: "repeat(3, minmax(0, 1fr))"}} gap={3}>
                                <Field.Root>
                                    <Field.Label>Genre</Field.Label>
                                    <NativeSelect.Root>
                                        <NativeSelect.Field aria-label="Filter by genre" minH="44px" value={filters.genre}
                                            onChange={event => setFilter("genre", event.target.value)}>
                                            <option value="">All genres</option>
                                            {filters.genre && !genres.includes(filters.genre) && <option value={filters.genre}>{filters.genre}</option>}
                                            {genres.map(genre => <option key={genre} value={genre}>{genre}</option>)}
                                        </NativeSelect.Field>
                                        <NativeSelect.Indicator/>
                                    </NativeSelect.Root>
                                </Field.Root>
                                <Field.Root>
                                    <Field.Label>Published from</Field.Label>
                                    <Input type="number" min={0} step={1} minH="44px" aria-label="Published from"
                                        value={filters.yearFrom} onChange={event => setFilter("yearFrom", event.target.value)}/>
                                </Field.Root>
                                <Field.Root>
                                    <Field.Label>Published to</Field.Label>
                                    <Input type="number" min={0} step={1} minH="44px" aria-label="Published to"
                                        value={filters.yearTo} onChange={event => setFilter("yearTo", event.target.value)}/>
                                </Field.Root>
                                <Field.Root>
                                    <Field.Label>Series</Field.Label>
                                    <Input minH="44px" aria-label="Filter by series" value={filters.series}
                                        onChange={event => setFilter("series", event.target.value)}/>
                                </Field.Root>
                                <Field.Root>
                                    <Field.Label>Language</Field.Label>
                                    <Input minH="44px" aria-label="Filter by language" value={filters.language}
                                        onChange={event => setFilter("language", event.target.value)}/>
                                </Field.Root>
                                <Field.Root>
                                    <Field.Label>Publisher</Field.Label>
                                    <Input minH="44px" aria-label="Filter by publisher" value={filters.publisher}
                                        onChange={event => setFilter("publisher", event.target.value)}/>
                                </Field.Root>
                            </Grid>
                            <Flex gap={3}>
                                <Field.Root flex="1">
                                    <Field.Label>Sort by</Field.Label>
                                    <NativeSelect.Root>
                                        <NativeSelect.Field aria-label="Sort books by" minH="44px" value={filters.sortBy}
                                            onChange={event => setFilter("sortBy", event.target.value)}>
                                            <option value="title">Title</option>
                                            <option value="author">Author</option>
                                            <option value="publishedYear">Published year</option>
                                        </NativeSelect.Field>
                                        <NativeSelect.Indicator/>
                                    </NativeSelect.Root>
                                </Field.Root>
                                <Field.Root flex="1">
                                    <Field.Label>Sort direction</Field.Label>
                                    <NativeSelect.Root>
                                        <NativeSelect.Field aria-label="Sort direction" minH="44px" value={filters.sortDirection}
                                            onChange={event => setFilter("sortDirection", event.target.value)}>
                                            <option value="ASC">Ascending</option>
                                            <option value="DESC">Descending</option>
                                        </NativeSelect.Field>
                                        <NativeSelect.Indicator/>
                                    </NativeSelect.Root>
                                </Field.Root>
                            </Flex>
                            {isError && <Flex align="center" gap={2}>
                                <Text color="fg.error" role="alert">Genre options could not be loaded.</Text>
                                <Button variant="outline" minH="44px" onClick={refetch}>Retry</Button>
                            </Flex>}
                            {hasFilters && <Button alignSelf="flex-start" variant="ghost" minH="44px" onClick={clearFilters}>
                                Clear filters
                            </Button>}
                        </Stack>
                    </Popover.Body>
                </Popover.Content>
            </Popover.Positioner>
        </Portal>
    </Popover.Root>;
}
