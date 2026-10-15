import {homebranchApi} from "@/shared/api/rtk-query";

export type BookClubRole = "owner" | "moderator" | "member";
export type ModerationAction = "lock" | "unlock" | "pin" | "unpin" | "hide" | "restore" | "delete";

export interface BookClubWork {
    id: string;
    clubId: string;
    title: string;
    author: string;
}

export interface BookClub {
    id: string;
    name: string;
    description?: string | null;
    visibility: "private" | "instance_visible";
    status: "active" | "archived";
    ownerUserId: string;
    selectedWork: BookClubWork;
}

export interface DiscussionThread {
    id: string;
    clubId: string;
    authorUserId: string;
    title: string;
    body?: string;
    spoiler: boolean;
    locked: boolean;
    pinned: boolean;
    promptKind: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface DiscussionReply {
    id: string;
    clubId: string;
    threadId: string;
    authorUserId: string;
    body?: string;
    spoiler: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface ModerationAuditEntry {
    id: string;
    clubId: string;
    actorUserId: string;
    action: ModerationAction;
    targetType: "thread" | "reply";
    targetId: string;
    createdAt: string;
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
        getDiscussionThreads: build.query<DiscussionThread[], {clubId: string; revealSpoilers?: boolean}>({
            query: ({clubId, revealSpoilers = false}) => ({
                url: `/book-clubs/${encodeURIComponent(clubId)}/discussions${revealSpoilers ? "?revealSpoilers=true" : ""}`,
            }),
            providesTags: (_result, _error, {clubId}) => [{type: "BookClub", id: `${clubId}:discussions`}],
        }),
        createDiscussionThread: build.mutation<DiscussionThread, {clubId: string; title: string; body: string; spoiler: boolean; promptKind?: boolean}>({
            query: ({clubId, ...body}) => ({url: `/book-clubs/${encodeURIComponent(clubId)}/discussions`, method: "POST", body}),
            invalidatesTags: (_result, _error, {clubId}) => [{type: "BookClub", id: `${clubId}:discussions`}],
        }),
        getDiscussionReplies: build.query<DiscussionReply[], {clubId: string; threadId: string; revealSpoilers?: boolean}>({
            query: ({clubId, threadId, revealSpoilers = false}) => ({
                url: `/book-clubs/${encodeURIComponent(clubId)}/discussions/${encodeURIComponent(threadId)}/replies${revealSpoilers ? "?revealSpoilers=true" : ""}`,
            }),
            providesTags: (_result, _error, {clubId, threadId}) => [{type: "BookClub", id: `${clubId}:thread:${threadId}`}],
        }),
        createDiscussionReply: build.mutation<DiscussionReply, {clubId: string; threadId: string; body: string; spoiler: boolean}>({
            query: ({clubId, threadId, ...body}) => ({url: `/book-clubs/${encodeURIComponent(clubId)}/discussions/${encodeURIComponent(threadId)}/replies`, method: "POST", body}),
            invalidatesTags: (_result, _error, {clubId, threadId}) => [{type: "BookClub", id: `${clubId}:thread:${threadId}`}],
        }),
        moderateDiscussionThread: build.mutation<void, {clubId: string; threadId: string; action: ModerationAction}>({
            query: ({clubId, threadId, action}) => ({url: `/book-clubs/${encodeURIComponent(clubId)}/discussions/${encodeURIComponent(threadId)}/moderation/${action}`, method: "POST"}),
            invalidatesTags: (_result, _error, {clubId, threadId}) => [{type: "BookClub", id: `${clubId}:discussions`}, {type: "BookClub", id: `${clubId}:thread:${threadId}`}],
        }),
        moderateDiscussionReply: build.mutation<void, {clubId: string; replyId: string; action: Extract<ModerationAction, "hide" | "restore" | "delete">}>({
            query: ({clubId, replyId, action}) => ({url: `/book-clubs/${encodeURIComponent(clubId)}/discussion-replies/${encodeURIComponent(replyId)}/moderation/${action}`, method: "POST"}),
            invalidatesTags: (_result, _error, {clubId, replyId}) => [{type: "BookClub", id: `${clubId}:discussions`}, {type: "BookClub", id: `${clubId}:reply:${replyId}`}],
        }),
        getDiscussionAudit: build.query<ModerationAuditEntry[], string>({
            query: (clubId) => ({url: `/book-clubs/${encodeURIComponent(clubId)}/discussion-audit`}),
        }),
    }),
});

export const {
    useGetBookClubsQuery,
    useGetBookClubQuery,
    useGetDiscussionThreadsQuery,
    useCreateDiscussionThreadMutation,
    useGetDiscussionRepliesQuery,
    useCreateDiscussionReplyMutation,
    useModerateDiscussionThreadMutation,
    useModerateDiscussionReplyMutation,
    useGetDiscussionAuditQuery,
} = bookClubsApi;
