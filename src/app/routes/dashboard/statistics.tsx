import type {Route} from "./+types/statistics";
import {Button, Stack} from "@chakra-ui/react";
import {Link} from "react-router";
import {EmptyState, PageHeader} from "@/shared/ui/EditorialUI";

export function meta({}: Route.MetaArgs) {
    return [
        {title: "Homebranch - Statistics"},
        {name: "description", content: "Reading statistics for your Homebranch library."},
    ];
}

export default function Statistics() {
    return <Stack maxW="960px" mx="auto" gap={8}>
        <PageHeader title="Reading statistics" description="A space to reflect on your reading."/>
        <EmptyState title="Statistics aren't available yet" action={
            <Button asChild minH="44px" colorPalette="orange"><Link to="/">Explore your library</Link></Button>
        }>Your books and reading progress are still available in your library.</EmptyState>
    </Stack>;
}
