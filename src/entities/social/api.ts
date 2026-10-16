import {homebranchApi} from "@/shared/api/rtk-query";

export interface Person {userId: string; name: string}
export interface PeopleResult {id: string; name: string}
export interface FriendRequest extends Person {id: string; createdAt: string}
export interface SocialSettings {allowFriendRequests: boolean; clubInvites: "anyone" | "friends" | "nobody"}
export interface ClubInvitation {
    id: string; clubId: string; clubName: string; bookTitle: string; bookAuthor: string;
    inviterUserId: string; inviterName: string; expiresAt: string; status: string;
}
export interface OrganizerInvitation extends Person {id: string; expiresAt: string; status: string}
export type NotificationKind = "friend_request" | "friend_accepted" | "club_invitation" | "club_invitation_accepted" | "club_discussion" | "club_reply" | "club_reading_plan";
export interface SocialNotification {
    id: string; kind: NotificationKind; actorName: string; clubId?: string | null; clubName?: string | null;
    threadId?: string | null; requestId?: string | null; createdAt: string; readAt: string | null;
}
export interface NotificationPage {items: SocialNotification[]; total: number; unreadCount: number; page: number; limit: number}

const socialTags = ["Social", "Notification"] as const;
const membershipTags = [...socialTags, "BookClub"] as const;
const id = encodeURIComponent;

export const socialApi = homebranchApi.injectEndpoints({
    endpoints: build => ({
        searchPeople: build.query<PeopleResult[], string>({
            query: q => ({url: "/social/people", params: {q}}), keepUnusedDataFor: 0, providesTags: ["Social"],
        }),
        getFriends: build.query<Person[], void>({
            query: () => "/social/friends", keepUnusedDataFor: 0, providesTags: ["Social"],
        }),
        getFriendRequests: build.query<{incoming: FriendRequest[]; outgoing: FriendRequest[]}, void>({
            query: () => "/social/friend-requests", keepUnusedDataFor: 0, providesTags: ["Social"],
        }),
        sendFriendRequest: build.mutation<unknown, string>({
            query: userId => ({url: "/social/friend-requests", method: "POST", body: {userId}}), invalidatesTags: socialTags,
        }),
        respondToFriendRequest: build.mutation<unknown, {requestId: string; action: "accept" | "decline" | "cancel"}>({
            query: ({requestId, action}) => ({url: `/social/friend-requests/${id(requestId)}/${action}`, method: "POST"}), invalidatesTags: socialTags,
        }),
        removeFriend: build.mutation<unknown, string>({
            query: userId => ({url: `/social/friends/${id(userId)}`, method: "DELETE"}), invalidatesTags: socialTags,
        }),
        getSocialSettings: build.query<SocialSettings, void>({
            query: () => "/social/settings", keepUnusedDataFor: 0, providesTags: ["Social"],
        }),
        updateSocialSettings: build.mutation<SocialSettings, SocialSettings>({
            query: body => ({url: "/social/settings", method: "PATCH", body}), invalidatesTags: socialTags,
        }),
        getBlockedPeople: build.query<Person[], void>({
            query: () => "/social/blocks", keepUnusedDataFor: 0, providesTags: ["Social"],
        }),
        blockPerson: build.mutation<unknown, string>({
            query: userId => ({url: "/social/blocks", method: "POST", body: {userId}}), invalidatesTags: socialTags,
        }),
        unblockPerson: build.mutation<unknown, string>({
            query: userId => ({url: `/social/blocks/${id(userId)}`, method: "DELETE"}), invalidatesTags: socialTags,
        }),
        getClubInvitations: build.query<ClubInvitation[], void>({
            query: () => "/social/club-invitations", keepUnusedDataFor: 0, providesTags: ["Social"],
        }),
        respondToClubInvitation: build.mutation<unknown, {invitationId: string; action: "accept" | "decline"}>({
            query: ({invitationId, action}) => ({url: `/social/club-invitations/${id(invitationId)}/${action}`, method: "POST"}), invalidatesTags: membershipTags,
        }),
        getOrganizerInvitations: build.query<OrganizerInvitation[], string>({
            query: clubId => `/book-clubs/${id(clubId)}/invitations`, keepUnusedDataFor: 0, providesTags: ["Social"],
        }),
        inviteToClub: build.mutation<unknown, {clubId: string; userId: string}>({
            query: ({clubId, userId}) => ({url: `/book-clubs/${id(clubId)}/invitations`, method: "POST", body: {userId}}), invalidatesTags: socialTags,
        }),
        cancelClubInvitation: build.mutation<unknown, {clubId: string; invitationId: string}>({
            query: ({clubId, invitationId}) => ({url: `/book-clubs/${id(clubId)}/invitations/${id(invitationId)}/cancel`, method: "POST"}), invalidatesTags: socialTags,
        }),
        getClubActivityPreference: build.query<{muted: boolean}, string>({
            query: clubId => `/book-clubs/${id(clubId)}/activity-preference`, keepUnusedDataFor: 0, providesTags: ["Social"],
        }),
        setClubActivityPreference: build.mutation<{muted: boolean}, {clubId: string; muted: boolean}>({
            query: ({clubId, muted}) => ({url: `/book-clubs/${id(clubId)}/activity-preference`, method: "PUT", body: {muted}}), invalidatesTags: socialTags,
        }),
        getNotifications: build.query<NotificationPage, number>({
            query: page => ({url: "/notifications", params: {page, limit: 20}}), keepUnusedDataFor: 0, providesTags: ["Notification"],
        }),
        getUnreadNotificationCount: build.query<{count: number}, void>({
            query: () => "/notifications/unread-count", keepUnusedDataFor: 0, providesTags: ["Notification"],
        }),
        markNotificationRead: build.mutation<unknown, string>({
            query: notificationId => ({url: `/notifications/${id(notificationId)}/read`, method: "POST"}), invalidatesTags: ["Notification"],
        }),
        markAllNotificationsRead: build.mutation<unknown, void>({
            query: () => ({url: "/notifications/read-all", method: "POST"}), invalidatesTags: ["Notification"],
        }),
        dismissNotification: build.mutation<unknown, string>({
            query: notificationId => ({url: `/notifications/${id(notificationId)}`, method: "DELETE"}), invalidatesTags: ["Notification"],
        }),
    }),
});

export const {
    useSearchPeopleQuery, useGetFriendsQuery, useGetFriendRequestsQuery, useSendFriendRequestMutation,
    useRespondToFriendRequestMutation, useRemoveFriendMutation, useGetSocialSettingsQuery,
    useUpdateSocialSettingsMutation, useGetBlockedPeopleQuery, useBlockPersonMutation, useUnblockPersonMutation,
    useGetClubInvitationsQuery, useRespondToClubInvitationMutation, useGetOrganizerInvitationsQuery,
    useInviteToClubMutation, useCancelClubInvitationMutation, useGetClubActivityPreferenceQuery,
    useSetClubActivityPreferenceMutation, useGetNotificationsQuery, useGetUnreadNotificationCountQuery,
    useMarkNotificationReadMutation, useMarkAllNotificationsReadMutation, useDismissNotificationMutation,
} = socialApi;

export const notificationRefresh = {
    pollingInterval: 30_000, skipPollingIfUnfocused: true, refetchOnFocus: true, refetchOnReconnect: true,
};
