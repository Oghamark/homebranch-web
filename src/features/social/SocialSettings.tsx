import {useState} from "react";
import {Box, NativeSelect, Stack, Text} from "@chakra-ui/react";
import {type SocialSettings as RequestPreferences, useGetBlockedPeopleQuery, useGetSocialSettingsQuery, useUnblockPersonMutation, useUpdateSocialSettingsMutation} from "@/entities/social/api";
import {ConfirmAction, EmptyState, ErrorState, LoadingState, PageSection} from "@/shared/ui/EditorialUI";
import {useSettingsDraft} from "@/features/settings/useSettingsDraft";
import {ActionButton, PersonRow} from "./SocialUI";

export function SocialSettings() {
    const query = useGetSocialSettingsQuery();
    const [update] = useUpdateSocialSettingsMutation();
    const [saved, setSaved] = useState(false);
    const draft = useSettingsDraft<RequestPreferences>(query.data, {allowFriendRequests: true, clubInvites: "anyone"});
    if (query.isLoading) return <LoadingState label="Loading request settings..."/>;
    if (query.error || !query.data) return <ErrorState onRetry={query.refetch}>Your request settings couldn't be loaded.</ErrorState>;
    return <Stack gap={9}>
        <PageSection title="Friends and invitations" description="Choose who can reach you. Your library and reading history always stay private.">
            <Box as="label" display="flex" alignItems="center" gap={3} minH="44px">
                <input type="checkbox" checked={draft.value.allowFriendRequests} onChange={e => {
                    draft.setValue({...draft.value, allowFriendRequests: e.target.checked}); setSaved(false);
                }}/> Allow friend requests
            </Box>
            <Stack gap={2}><label htmlFor="club-invite-policy">Who can invite you to a club?</label>
                <NativeSelect.Root minH="44px"><NativeSelect.Field id="club-invite-policy" value={draft.value.clubInvites} onChange={e => {
                    const clubInvites = e.target.value;
                    if (clubInvites === "anyone" || clubInvites === "friends" || clubInvites === "nobody") {
                        draft.setValue({...draft.value, clubInvites}); setSaved(false);
                    }
                }}><option value="anyone">Anyone on this Homebranch</option><option value="friends">Friends only</option><option value="nobody">No one</option></NativeSelect.Field><NativeSelect.Indicator/></NativeSelect.Root>
            </Stack>
            <Text fontSize="sm" color="fg.muted">Restricting requests cancels pending requests that no longer meet your choices. Existing friendships and club memberships stay as they are.</Text>
            <Box alignSelf="start"><ConfirmAction title="Save your request settings?" actionLabel="Save request settings" disabled={!draft.dirty}
                description="Pending requests and invitations that no longer match your choices will be canceled. They won't come back automatically if you change these settings later."
                onConfirm={async () => {const result = await update(draft.value).unwrap(); draft.accept(result); setSaved(true);}}/></Box>
            {saved && <Text role="status" color="fg.muted">Your request settings are saved.</Text>}
        </PageSection>
        <BlockedPeople/>
    </Stack>;
}

function BlockedPeople() {
    const query = useGetBlockedPeopleQuery();
    const [unblock] = useUnblockPersonMutation();
    return <PageSection title="Blocked people" description="Blocking stops friend requests and club invitations in both directions, but does not change shared club membership or discussions.">
        {query.isLoading ? <LoadingState label="Loading blocked people..."/> : query.error || !query.data ? <ErrorState onRetry={query.refetch}>Your blocked list couldn't be loaded.</ErrorState>
            : !query.data.length ? <EmptyState title="No blocked people">You can block someone from Friends or Find people.</EmptyState>
                : <Stack gap={0}>{query.data.map(person => <PersonRow key={person.userId} name={person.name}>
                    <ActionButton run={() => unblock(person.userId).unwrap()}>Unblock</ActionButton>
                </PersonRow>)}</Stack>}
        <Text color="fg.muted" fontSize="sm">Unblocking never restores a friendship or a canceled request.</Text>
    </PageSection>;
}
