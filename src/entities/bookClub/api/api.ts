import {homebranchApi} from "@/shared/api/rtk-query";

export type BookClubRole = "owner" | "moderator" | "member";
export type ModerationAction = "lock" | "unlock" | "pin" | "unpin" | "hide" | "restore" | "delete";

export interface BookClubWork { id: string; clubId: string; title: string; author: string; }
export interface BookClub {
    id: string;
    name: string;
    description?: string | null;
    visibility: "private" | "instance_visible";
    status: "active" | "archived";
    ownerUserId: string;
    /** Role for the authenticated caller only; never a role for another member. */
    currentMembershipRole?: BookClubRole | null;
    selectedWork: BookClubWork;
}
export interface DiscussionThread {
    id: string; clubId: string; authorUserId: string; title: string; body?: string; spoiler: boolean;
    locked: boolean; pinned: boolean; promptKind: boolean; createdAt: string; updatedAt: string;
}
export interface DiscussionReply {
    id: string; clubId: string; threadId: string; authorUserId: string; body?: string; spoiler: boolean;
    createdAt: string; updatedAt: string;
}
export interface ModerationAuditEntry {
    id: string; clubId: string; actorUserId: string; action: ModerationAction;
    targetType: "thread" | "reply"; targetId: string; createdAt: string;
}
export interface DiscussionRecoveryTarget {
    id: string; type: "thread" | "reply"; hidden: boolean; deleted: boolean;
}

export const bookClubsApi = homebranchApi.injectEndpoints({
    endpoints: (build) => ({
        getBookClubs: build.query<BookClub[], void>({
            query: () => ({url: "/book-clubs"}),
            providesTags: (clubs) => clubs
                ? [...clubs.map(({id}) => ({type: "BookClub" as const, id})), {type: "BookClub", id: "LIST"}]
                : [{type: "BookClub", id: "LIST"}],
        }),
        getBookClub: build.query<BookClub, string>({
            query: (clubId) => ({url: `/book-clubs/${encodeURIComponent(clubId)}`}),
            providesTags: (_result, _error, clubId) => [{type: "BookClub", id: clubId}],
        }),
        getDiscussionThreads: build.query<DiscussionThread[], {clubId: string}>({
            // The API has only bulk disclosure. Do not request it: RTK Query would cache every spoiler body.
            query: ({clubId}) => ({url: `/book-clubs/${encodeURIComponent(clubId)}/discussions`}),
            providesTags: (_result, _error, {clubId}) => [{type: "BookClub", id: `${clubId}:discussions`}],
        }),
        createDiscussionThread: build.mutation<DiscussionThread, {clubId: string; title: string; body: string; spoiler: boolean; promptKind?: boolean}>({
            query: ({clubId, ...body}) => ({url: `/book-clubs/${encodeURIComponent(clubId)}/discussions`, method: "POST", body}),
            invalidatesTags: (_result, _error, {clubId}) => [{type: "BookClub", id: `${clubId}:discussions`}],
        }),
        getDiscussionReplies: build.query<DiscussionReply[], {clubId: string; threadId: string}>({
            query: ({clubId, threadId}) => ({url: `/book-clubs/${encodeURIComponent(clubId)}/discussions/${encodeURIComponent(threadId)}/replies`}),
            providesTags: (_result, _error, {clubId, threadId}) => [{type: "BookClub", id: `${clubId}:thread:${threadId}`}, {type: "BookClub", id: `${clubId}:replies`}],
        }),
        createDiscussionReply: build.mutation<DiscussionReply, {clubId: string; threadId: string; body: string; spoiler: boolean}>({
            query: ({clubId, threadId, ...body}) => ({url: `/book-clubs/${encodeURIComponent(clubId)}/discussions/${encodeURIComponent(threadId)}/replies`, method: "POST", body}),
            invalidatesTags: (_result, _error, {clubId, threadId}) => [{type: "BookClub", id: `${clubId}:thread:${threadId}`}, {type: "BookClub", id: `${clubId}:replies`}],
        }),
        updateDiscussionThread: build.mutation<DiscussionThread, {clubId: string; threadId: string; title: string; body: string; spoiler: boolean}>({
            query: ({clubId, threadId, ...body}) => ({url: `/book-clubs/${encodeURIComponent(clubId)}/discussions/${encodeURIComponent(threadId)}`, method: "PATCH", body}),
            invalidatesTags: (_result, _error, {clubId, threadId}) => [{type: "BookClub", id: `${clubId}:discussions`}, {type: "BookClub", id: `${clubId}:thread:${threadId}`}],
        }),
        deleteDiscussionThread: build.mutation<void, {clubId: string; threadId: string}>({
            query: ({clubId, threadId}) => ({url: `/book-clubs/${encodeURIComponent(clubId)}/discussions/${encodeURIComponent(threadId)}`, method: "DELETE"}),
            invalidatesTags: (_result, _error, {clubId, threadId}) => [{type: "BookClub", id: `${clubId}:discussions`}, {type: "BookClub", id: `${clubId}:thread:${threadId}`}],
        }),
        updateDiscussionReply: build.mutation<DiscussionReply, {clubId: string; threadId: string; replyId: string; body: string; spoiler: boolean}>({
            query: ({clubId, replyId, ...body}) => ({url: `/book-clubs/${encodeURIComponent(clubId)}/discussion-replies/${encodeURIComponent(replyId)}`, method: "PATCH", body}),
            invalidatesTags: (_result, _error, {clubId, threadId}) => [{type: "BookClub", id: `${clubId}:thread:${threadId}`}, {type: "BookClub", id: `${clubId}:replies`}],
        }),
        deleteDiscussionReply: build.mutation<void, {clubId: string; threadId: string; replyId: string}>({
            query: ({clubId, replyId}) => ({url: `/book-clubs/${encodeURIComponent(clubId)}/discussion-replies/${encodeURIComponent(replyId)}`, method: "DELETE"}),
            invalidatesTags: (_result, _error, {clubId, threadId}) => [{type: "BookClub", id: `${clubId}:thread:${threadId}`}, {type: "BookClub", id: `${clubId}:replies`}],
        }),
        moderateDiscussionThread: build.mutation<void, {clubId: string; threadId: string; action: ModerationAction}>({
            query: ({clubId, threadId, action}) => ({url: `/book-clubs/${encodeURIComponent(clubId)}/discussions/${encodeURIComponent(threadId)}/moderation/${action}`, method: "POST"}),
            invalidatesTags: (_result, _error, {clubId, threadId}) => [{type: "BookClub", id: `${clubId}:discussions`}, {type: "BookClub", id: `${clubId}:thread:${threadId}`}, {type: "BookClub", id: `${clubId}:replies`}, {type: "BookClub", id: `${clubId}:recovery`}, {type: "BookClub", id: `${clubId}:audit`}],
        }),
        moderateDiscussionReply: build.mutation<void, {clubId: string; threadId?: string; replyId: string; action: Extract<ModerationAction, "hide" | "restore" | "delete">}>({
            query: ({clubId, replyId, action}) => ({url: `/book-clubs/${encodeURIComponent(clubId)}/discussion-replies/${encodeURIComponent(replyId)}/moderation/${action}`, method: "POST"}),
            invalidatesTags: (_result, _error, {clubId, threadId}) => [
                {type: "BookClub", id: `${clubId}:discussions`},
                ...(threadId ? [{type: "BookClub" as const, id: `${clubId}:thread:${threadId}`}] : []),
                {type: "BookClub", id: `${clubId}:replies`},
                {type: "BookClub", id: `${clubId}:recovery`},
                {type: "BookClub", id: `${clubId}:audit`},
            ],
        }),
        getDiscussionRecoveryTargets: build.query<DiscussionRecoveryTarget[], string>({
            query: (clubId) => ({url: `/book-clubs/${encodeURIComponent(clubId)}/discussion-recovery-targets`}),
            providesTags: (_result, _error, clubId) => [{type: "BookClub", id: `${clubId}:recovery`}],
        }),
        getDiscussionAudit: build.query<ModerationAuditEntry[], string>({
            query: (clubId) => ({url: `/book-clubs/${encodeURIComponent(clubId)}/discussion-audit`}),
            providesTags: (_result, _error, clubId) => [{type: "BookClub", id: `${clubId}:audit`}],
        }),
    }),
});

export const {
    useGetBookClubsQuery, useGetBookClubQuery, useGetDiscussionThreadsQuery, useCreateDiscussionThreadMutation,
    useGetDiscussionRepliesQuery, useCreateDiscussionReplyMutation, useUpdateDiscussionThreadMutation,
    useDeleteDiscussionThreadMutation, useUpdateDiscussionReplyMutation, useDeleteDiscussionReplyMutation,
    useModerateDiscussionThreadMutation, useModerateDiscussionReplyMutation, useGetDiscussionAuditQuery,
    useGetDiscussionRecoveryTargetsQuery,
} = bookClubsApi;
