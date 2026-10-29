import {Stack, Text} from "@chakra-ui/react";
import {useGetClubActivityPreferenceQuery, useSetClubActivityPreferenceMutation} from "@/entities/social/api";
import {ErrorState, LoadingState} from "@/shared/ui/EditorialUI";
import {ActionButton} from "./SocialUI";

export function ClubActivityPreference({clubId}: {clubId: string}) {
    const query = useGetClubActivityPreferenceQuery(clubId);
    const [save] = useSetClubActivityPreferenceMutation();
    return <Stack gap={2} borderTopWidth="1px" pt={4}>
        <Text fontWeight="medium">Club notifications</Text>
        <Text fontSize="sm" color="fg.muted">New discussions, replies to conversations you've joined, and reading-plan changes. Your reading progress is never included.</Text>
        {query.isLoading ? <LoadingState label="Loading notification preference..."/> : query.error || !query.data ? <ErrorState onRetry={query.refetch}>Your notification preference couldn't be loaded.</ErrorState>
            : <ActionButton run={() => save({clubId, muted: !query.data!.muted}).unwrap()}>{query.data.muted ? "Turn on club notifications" : "Mute club notifications"}</ActionButton>}
    </Stack>;
}
