import {homebranchApi} from "@/shared/api/rtk-query";
import type {BaseQueryApi} from "@reduxjs/toolkit/query";

export type BookClubRole = "owner" | "moderator" | "member";
export type BookClubVisibility = "private" | "instance_visible";
export type ModerationAction = "lock" | "unlock" | "pin" | "unpin" | "hide" | "restore" | "delete";
export type MilestoneKind = "part" | "chapter" | "checkpoint";
export type ProgressStatus = "not_started" | "in_progress" | "completed";
export type ReadingCopySource = "shared" | "personal" | "none";

export interface BookClubWork { id: string; clubId: string; title: string; author: string; isbn?: string | null; externalWorkId?: string | null; editionId?: string | null; series?: string | null; seriesPosition?: number | null; coverImageFileName?: string | null; }
export interface BookClub { id: string; name: string; description?: string | null; visibility: BookClubVisibility; status: "active" | "archived"; ownerUserId: string; currentMembershipRole?: BookClubRole | null; selectedWork: BookClubWork; }
export interface BookClubMember { id?: string; clubId?: string; userId: string; role: BookClubRole; createdAt?: string; }
export interface Milestone { id: string; workId?: string; name: string; kind: MilestoneKind; position: number; memberMapping?: {memberLabel: string; memberPosition?: number | null} | null; memberProgress?: {status: ProgressStatus; percentage?: number | null} | null; }
export interface BookClubSchedule { clubId?: string; startDate?: string | null; completionDate?: string | null; milestones: Milestone[]; progressSharingEnabled?: boolean; sharedProgress?: Array<{userId: string; milestones: Array<{milestoneId: string; status: ProgressStatus; percentage: number | null}>}>; }
export interface BookClubScheduleResponse {
 clubId: string;
 startDate: string | null;
 completionDate: string | null;
 milestones: Array<Omit<Milestone, "memberMapping" | "memberProgress">>;
 progressSharingEnabled: boolean;
 myMappings: Array<{milestoneId: string; memberLabel: string; memberPosition: number | null}>;
 myProgress: Array<{milestoneId: string; status: ProgressStatus; percentage: number | null}>;
 sharedProgress: Array<{userId: string; milestones: Array<{milestoneId: string; status: ProgressStatus; percentage: number | null}>}>;
}
export interface ReadingCopyState { clubId: string; workId: string; source: ReadingCopySource; available: boolean; book: {id: string; title: string; author: string} | null; associationMethod?: "identifier" | "metadata_candidate" | "manual_confirmation" | null; confidence?: number | null; }
export interface ReadingCopyMatch { bookId: string; title: string; author: string; method: "identifier" | "metadata_candidate"; confidence: number; confirmationRequired: true; }
export interface DiscussionThread { id: string; clubId: string; authorUserId: string; title: string; body?: string; spoiler: boolean; locked: boolean; pinned: boolean; promptKind: boolean; createdAt: string; updatedAt: string; }
export interface DiscussionReply { id: string; clubId: string; threadId: string; authorUserId: string; body?: string; spoiler: boolean; createdAt: string; updatedAt: string; }
export interface ModerationAuditEntry { id: string; clubId: string; actorUserId: string; action: ModerationAction; targetType: "thread" | "reply"; targetId: string; createdAt: string; }
export interface DiscussionRecoveryTarget { id: string; type: "thread" | "reply"; hidden: boolean; deleted: boolean; }

const clubTag = (id: string) => ({type: "BookClub" as const, id});
const detailTags = (clubId: string) => [clubTag(clubId), clubTag(`club:${clubId}`), clubTag(`roster:${clubId}`), clubTag(`schedule:${clubId}`), clubTag(`${clubId}:discussions`), clubTag(`${clubId}:replies`), clubTag(`${clubId}:recovery`), clubTag(`${clubId}:audit`)];
const memberTags = (clubId: string) => [...detailTags(clubId), clubTag(`roster:${clubId}`), {type: "User" as const, id: "LIST"}];
const scheduleTags = (clubId: string) => [...detailTags(clubId), clubTag(`schedule:${clubId}`)];
const copyTags = (clubId: string, workId: string) => [...scheduleTags(clubId), clubTag(`copy:${clubId}:${workId}`), clubTag(`matches:${clubId}:${workId}`)];
const coverTag = {type: "Book" as const, id: "LIST"};

function clearDiscussionBodies({clubId}: {clubId: string}, {dispatch, getState, queryFulfilled}: Pick<BaseQueryApi, "dispatch" | "getState"> & {queryFulfilled?: Promise<unknown>}): void {
 if (queryFulfilled) void queryFulfilled.then(
  () => dispatch(homebranchApi.util.invalidateTags(["Social", "Notification"])),
  () => undefined,
 );
 const state = getState() as Parameters<typeof bookClubsApi.util.selectCachedArgsForQuery>[0];
 for (const args of bookClubsApi.util.selectCachedArgsForQuery(state, "getDiscussionThread")) {
  if (args.clubId === clubId) dispatch(bookClubsApi.util.updateQueryData("getDiscussionThread", args, draft => {delete draft.body;}));
 }
 for (const args of bookClubsApi.util.selectCachedArgsForQuery(state, "getDiscussionReply")) {
  if (args.clubId === clubId) dispatch(bookClubsApi.util.updateQueryData("getDiscussionReply", args, draft => {delete draft.body;}));
 }
 for (const args of bookClubsApi.util.selectCachedArgsForQuery(state, "getDiscussionThreads")) {
  if (args.clubId === clubId) dispatch(bookClubsApi.util.updateQueryData("getDiscussionThreads", args, draft => {for (const row of draft) delete row.body;}));
 }
 for (const args of bookClubsApi.util.selectCachedArgsForQuery(state, "getDiscussionReplies")) {
  if (args.clubId === clubId) dispatch(bookClubsApi.util.updateQueryData("getDiscussionReplies", args, draft => {for (const row of draft) delete row.body;}));
 }
}

export const bookClubsApi = homebranchApi.injectEndpoints({
 endpoints: (build) => ({
  getBookClubs: build.query<BookClub[], void>({query: () => ({url: "/book-clubs"}), providesTags: (clubs) => clubs ? [...clubs.map(({id}) => clubTag(id)), clubTag("LIST"), coverTag] : [clubTag("LIST"), coverTag]}),
  getArchivedBookClubs: build.query<BookClub[], void>({query: () => ({url: "/book-clubs/archived"}), providesTags: (clubs) => clubs ? [...clubs.map(({id}) => clubTag(id)), clubTag("ARCHIVED"), coverTag] : [clubTag("ARCHIVED"), coverTag]}),
  getBookClub: build.query<BookClub, string>({query: (clubId) => ({url: `/book-clubs/${encodeURIComponent(clubId)}`}), providesTags: (_r, _e, clubId) => [...detailTags(clubId), coverTag]}),
  createBookClub: build.mutation<BookClub, {name: string; description?: string; visibility: BookClubVisibility; selectedWork: Omit<BookClubWork, "id" | "clubId" | "coverImageFileName">}>({query: (body) => ({url: "/book-clubs", method: "POST", body}), invalidatesTags: [clubTag("LIST")]}),
  updateBookClub: build.mutation<BookClub, {clubId: string; name?: string; description?: string | null; visibility?: BookClubVisibility; selectedWork?: Omit<BookClubWork, "id" | "clubId" | "coverImageFileName">}>({query: ({clubId, ...body}) => ({url: `/book-clubs/${encodeURIComponent(clubId)}`, method: "PATCH", body}), invalidatesTags: (_r, _e, {clubId}) => [...detailTags(clubId), clubTag("LIST"), clubTag("ARCHIVED"), clubTag(`schedule:${clubId}`)]}),
  joinBookClub: build.mutation<BookClubMember, string>({query: (clubId) => ({url: `/book-clubs/${encodeURIComponent(clubId)}/join`, method: "POST"}), invalidatesTags: (_r, _e, clubId) => [...detailTags(clubId), clubTag("LIST")]}),
  archiveBookClub: build.mutation<BookClub, string>({query: (clubId) => ({url: `/book-clubs/${encodeURIComponent(clubId)}/archive`, method: "POST"}), invalidatesTags: (_r, _e, clubId) => [...detailTags(clubId), clubTag("LIST"), clubTag("ARCHIVED")]}),
  deleteBookClub: build.mutation<void, string>({query: (clubId) => ({url: `/book-clubs/${encodeURIComponent(clubId)}`, method: "DELETE"}), invalidatesTags: (_r, _e, clubId) => [...detailTags(clubId), clubTag("LIST"), clubTag("ARCHIVED"), clubTag(`roster:${clubId}`), clubTag(`schedule:${clubId}`)]}),
  getBookClubMembers: build.query<BookClubMember[], string>({query: (clubId) => ({url: `/book-clubs/${encodeURIComponent(clubId)}/members`}), providesTags: (_r, _e, clubId) => [clubTag(`roster:${clubId}`)]}),
  updateBookClubMember: build.mutation<BookClubMember, {clubId: string; userId: string; role: "moderator" | "member"}>({query: ({clubId, userId, ...body}) => ({url: `/book-clubs/${encodeURIComponent(clubId)}/members/${encodeURIComponent(userId)}`, method: "PATCH", body}), invalidatesTags: (_r, _e, {clubId}) => memberTags(clubId)}),
  removeBookClubMember: build.mutation<void, {clubId: string; userId: string}>({query: ({clubId, userId}) => ({url: `/book-clubs/${encodeURIComponent(clubId)}/members/${encodeURIComponent(userId)}`, method: "DELETE"}), invalidatesTags: (_r, _e, {clubId}) => memberTags(clubId)}),
  transferBookClubOwnership: build.mutation<BookClub, {clubId: string; newOwnerUserId: string}>({query: ({clubId, newOwnerUserId}) => ({url: `/book-clubs/${encodeURIComponent(clubId)}/transfer-ownership`, method: "POST", body: {newOwnerUserId}}), invalidatesTags: (_r, _e, {clubId}) => memberTags(clubId)}),
  getBookClubSchedule: build.query<BookClubSchedule, string>({
   query: (clubId) => ({url: `/book-clubs/${encodeURIComponent(clubId)}/schedule`}),
   transformResponse: (response: BookClubScheduleResponse): BookClubSchedule => {
    const mappings = new Map(response.myMappings.map(({milestoneId, ...mapping}) => [milestoneId, mapping]));
    const progress = new Map(response.myProgress.map(({milestoneId, ...progress}) => [milestoneId, progress]));
    return {
     clubId: response.clubId,
     startDate: response.startDate,
     completionDate: response.completionDate,
     progressSharingEnabled: response.progressSharingEnabled,
     milestones: response.milestones.map(step => ({
      ...step,
      memberMapping: mappings.get(step.id) ?? null,
      memberProgress: progress.get(step.id) ?? null,
     })),
     sharedProgress: response.sharedProgress,
    };
   },
   providesTags: (_r, _e, clubId) => [clubTag(`schedule:${clubId}`), clubTag(`club:${clubId}`)],
  }),
  updateBookClubSchedule: build.mutation<BookClubSchedule, {clubId: string; startDate?: string | null; completionDate?: string | null; milestones?: Array<{name: string; kind: MilestoneKind; position: number}>}>({query: ({clubId, ...body}) => ({url: `/book-clubs/${encodeURIComponent(clubId)}/schedule`, method: "PUT", body}), invalidatesTags: (_r, _e, {clubId}) => scheduleTags(clubId)}),
  patchBookClubSchedule: build.mutation<BookClubSchedule, {clubId: string; startDate?: string | null; completionDate?: string | null; milestones?: Array<{id?: string; name: string; kind: MilestoneKind; position: number}>}>({query: ({clubId, ...body}) => ({url: `/book-clubs/${encodeURIComponent(clubId)}/schedule`, method: "PATCH", body}), invalidatesTags: (_r, _e, {clubId}) => scheduleTags(clubId)}),
  setMilestoneMapping: build.mutation<void, {clubId: string; milestoneId: string; memberLabel: string; memberPosition?: number | null}>({query: ({clubId, milestoneId, ...body}) => ({url: `/book-clubs/${encodeURIComponent(clubId)}/milestones/${encodeURIComponent(milestoneId)}/mapping`, method: "PUT", body}), invalidatesTags: (_r, _e, {clubId}) => scheduleTags(clubId)}),
  clearMilestoneMapping: build.mutation<void, {clubId: string; milestoneId: string}>({query: ({clubId, milestoneId}) => ({url: `/book-clubs/${encodeURIComponent(clubId)}/milestones/${encodeURIComponent(milestoneId)}/mapping`, method: "DELETE"}), invalidatesTags: (_r, _e, {clubId}) => scheduleTags(clubId)}),
  setMilestoneProgress: build.mutation<void, {clubId: string; milestoneId: string; status: ProgressStatus; percentage?: number | null}>({query: ({clubId, milestoneId, ...body}) => ({url: `/book-clubs/${encodeURIComponent(clubId)}/milestones/${encodeURIComponent(milestoneId)}/progress`, method: "PUT", body}), invalidatesTags: (_r, _e, {clubId}) => scheduleTags(clubId)}),
  getReadingCopy: build.query<ReadingCopyState, {clubId: string; workId: string}>({query: ({clubId, workId}) => ({url: `/book-clubs/${encodeURIComponent(clubId)}/works/${encodeURIComponent(workId)}/reading-copy`}), providesTags: (_r, _e, {clubId, workId}) => [clubTag(`copy:${clubId}:${workId}`), clubTag(`club:${clubId}`)]}),
  getReadingCopyMatches: build.query<ReadingCopyMatch[], {clubId: string; workId: string}>({query: ({clubId, workId}) => ({url: `/book-clubs/${encodeURIComponent(clubId)}/works/${encodeURIComponent(workId)}/reading-copy/matches`}), providesTags: (_r, _e, {clubId, workId}) => [clubTag(`matches:${clubId}:${workId}`), clubTag(`club:${clubId}`)]}),
  confirmReadingCopyMatch: build.mutation<ReadingCopyState, {clubId: string; workId: string; bookId: string}>({query: ({clubId, workId, bookId}) => ({url: `/book-clubs/${encodeURIComponent(clubId)}/works/${encodeURIComponent(workId)}/reading-copy/matches/confirm`, method: "POST", body: {bookId}}), invalidatesTags: (_r, _e, x) => copyTags(x.clubId, x.workId)}),
  setReadingCopy: build.mutation<ReadingCopyState, {clubId: string; workId: string; source: "shared" | "personal"; bookId: string}>({query: ({clubId, workId, ...body}) => ({url: `/book-clubs/${encodeURIComponent(clubId)}/works/${encodeURIComponent(workId)}/reading-copy`, method: "PUT", body}), invalidatesTags: (_r, _e, x) => copyTags(x.clubId, x.workId)}),
  clearReadingCopy: build.mutation<void, {clubId: string; workId: string}>({query: ({clubId, workId}) => ({url: `/book-clubs/${encodeURIComponent(clubId)}/works/${encodeURIComponent(workId)}/reading-copy`, method: "DELETE"}), invalidatesTags: (_r, _e, x) => copyTags(x.clubId, x.workId)}),
  getDiscussionThreads: build.query<DiscussionThread[], {clubId: string}>({query: ({clubId}) => ({url: `/book-clubs/${encodeURIComponent(clubId)}/discussions`}), providesTags: (_r, _e, {clubId}) => [clubTag(`${clubId}:discussions`)]}),
  getDiscussionThread: build.query<DiscussionThread, {clubId: string; threadId: string; revealSpoilers?: boolean}>({query: ({clubId, threadId, revealSpoilers}) => ({url: `/book-clubs/${encodeURIComponent(clubId)}/discussions/${encodeURIComponent(threadId)}`, params: revealSpoilers === true ? {revealSpoilers: true} : undefined}), keepUnusedDataFor: 0, providesTags: (_r, _e, {clubId, threadId}) => [clubTag(`${clubId}:discussions`), clubTag(`${clubId}:thread:${threadId}`)]}),
  getDiscussionReply: build.query<DiscussionReply, {clubId: string; replyId: string; revealSpoilers?: boolean}>({query: ({clubId, replyId, revealSpoilers}) => ({url: `/book-clubs/${encodeURIComponent(clubId)}/discussion-replies/${encodeURIComponent(replyId)}`, params: revealSpoilers === true ? {revealSpoilers: true} : undefined}), keepUnusedDataFor: 0, providesTags: (_r, _e, {clubId}) => [clubTag(`${clubId}:discussions`), clubTag(`${clubId}:replies`)]}),
  createDiscussionThread: build.mutation<DiscussionThread, {clubId: string; title: string; body: string; spoiler: boolean; promptKind?: boolean}>({query: ({clubId, ...body}) => ({url: `/book-clubs/${encodeURIComponent(clubId)}/discussions`, method: "POST", body}), invalidatesTags: (_r, _e, {clubId}) => [clubTag(`${clubId}:discussions`)]}),
  getDiscussionReplies: build.query<DiscussionReply[], {clubId: string; threadId: string}>({query: ({clubId, threadId}) => ({url: `/book-clubs/${encodeURIComponent(clubId)}/discussions/${encodeURIComponent(threadId)}/replies`}), providesTags: (_r, _e, {clubId, threadId}) => [clubTag(`${clubId}:thread:${threadId}`), clubTag(`${clubId}:replies`)]}),
  createDiscussionReply: build.mutation<DiscussionReply, {clubId: string; threadId: string; body: string; spoiler: boolean}>({query: ({clubId, threadId, ...body}) => ({url: `/book-clubs/${encodeURIComponent(clubId)}/discussions/${encodeURIComponent(threadId)}/replies`, method: "POST", body}), invalidatesTags: (_r, _e, {clubId, threadId}) => [clubTag(`${clubId}:thread:${threadId}`), clubTag(`${clubId}:replies`)]}),
  updateDiscussionThread: build.mutation<DiscussionThread, {clubId: string; threadId: string; title: string; body: string; spoiler: boolean}>({query: ({clubId, threadId, ...body}) => ({url: `/book-clubs/${encodeURIComponent(clubId)}/discussions/${encodeURIComponent(threadId)}`, method: "PATCH", body}), invalidatesTags: (_r, _e, {clubId, threadId}) => [clubTag(`${clubId}:discussions`), clubTag(`${clubId}:thread:${threadId}`)]}),
  deleteDiscussionThread: build.mutation<void, {clubId: string; threadId: string}>({query: ({clubId, threadId}) => ({url: `/book-clubs/${encodeURIComponent(clubId)}/discussions/${encodeURIComponent(threadId)}`, method: "DELETE"}), invalidatesTags: (_r, _e, {clubId, threadId}) => [clubTag(`${clubId}:discussions`), clubTag(`${clubId}:thread:${threadId}`), clubTag(`${clubId}:recovery`)]}),
  updateDiscussionReply: build.mutation<DiscussionReply, {clubId: string; threadId: string; replyId: string; body: string; spoiler: boolean}>({query: ({clubId, replyId, body, spoiler}) => ({url: `/book-clubs/${encodeURIComponent(clubId)}/discussion-replies/${encodeURIComponent(replyId)}`, method: "PATCH", body: {body, spoiler}}), invalidatesTags: (_r, _e, {clubId, threadId}) => [clubTag(`${clubId}:thread:${threadId}`), clubTag(`${clubId}:replies`)]}),
  deleteDiscussionReply: build.mutation<void, {clubId: string; threadId: string; replyId: string}>({query: ({clubId, replyId}) => ({url: `/book-clubs/${encodeURIComponent(clubId)}/discussion-replies/${encodeURIComponent(replyId)}`, method: "DELETE"}), invalidatesTags: (_r, _e, {clubId, threadId}) => [clubTag(`${clubId}:thread:${threadId}`), clubTag(`${clubId}:replies`), clubTag(`${clubId}:recovery`)]}),
  moderateDiscussionThread: build.mutation<void, {clubId: string; threadId: string; action: ModerationAction}>({query: ({clubId, threadId, action}) => ({url: `/book-clubs/${encodeURIComponent(clubId)}/discussions/${encodeURIComponent(threadId)}/moderation/${action}`, method: "POST"}), invalidatesTags: (_r, _e, {clubId, threadId}) => [clubTag(`${clubId}:discussions`), clubTag(`${clubId}:thread:${threadId}`), clubTag(`${clubId}:replies`), clubTag(`${clubId}:recovery`), clubTag(`${clubId}:audit`)]}),
  moderateDiscussionReply: build.mutation<void, {clubId: string; threadId?: string; replyId: string; action: Extract<ModerationAction, "hide" | "restore" | "delete">}>({query: ({clubId, replyId, action}) => ({url: `/book-clubs/${encodeURIComponent(clubId)}/discussion-replies/${encodeURIComponent(replyId)}/moderation/${action}`, method: "POST"}), invalidatesTags: (_r, _e, {clubId, threadId}) => [clubTag(`${clubId}:discussions`), ...(threadId ? [clubTag(`${clubId}:thread:${threadId}`)] : []), clubTag(`${clubId}:replies`), clubTag(`${clubId}:recovery`), clubTag(`${clubId}:audit`)]}),
  getDiscussionRecoveryTargets: build.query<DiscussionRecoveryTarget[], string>({query: (clubId) => ({url: `/book-clubs/${encodeURIComponent(clubId)}/discussion-recovery-targets`}), providesTags: (_r, _e, clubId) => [clubTag(`${clubId}:recovery`)]}),
  getDiscussionAudit: build.query<ModerationAuditEntry[], string>({query: (clubId) => ({url: `/book-clubs/${encodeURIComponent(clubId)}/discussion-audit`}), providesTags: (_r, _e, clubId) => [clubTag(`${clubId}:audit`)]}),
 })
});

bookClubsApi.enhanceEndpoints({
 endpoints: {
  getDiscussionThreads: {onQueryStarted: (args, {dispatch}) => {
   dispatch(bookClubsApi.util.updateQueryData("getDiscussionThreads", args, draft => {for (const row of draft) delete row.body;}));
  }},
  getDiscussionReplies: {onQueryStarted: (args, {dispatch}) => {
   dispatch(bookClubsApi.util.updateQueryData("getDiscussionReplies", args, draft => {for (const row of draft) delete row.body;}));
  }},
  getDiscussionThread: {onQueryStarted: (args, {dispatch}) => {
   dispatch(bookClubsApi.util.updateQueryData("getDiscussionThread", args, draft => {delete draft.body;}));
  }},
  getDiscussionReply: {onQueryStarted: (args, {dispatch}) => {
   dispatch(bookClubsApi.util.updateQueryData("getDiscussionReply", args, draft => {delete draft.body;}));
  }},
  updateBookClub: {onQueryStarted: clearDiscussionBodies},
  joinBookClub: {onQueryStarted: (clubId, api) => clearDiscussionBodies({clubId}, api)},
  archiveBookClub: {onQueryStarted: (clubId, api) => clearDiscussionBodies({clubId}, api)},
  deleteBookClub: {onQueryStarted: (clubId, api) => clearDiscussionBodies({clubId}, api)},
  updateBookClubMember: {onQueryStarted: clearDiscussionBodies},
  removeBookClubMember: {onQueryStarted: clearDiscussionBodies},
  transferBookClubOwnership: {onQueryStarted: clearDiscussionBodies},
  updateDiscussionThread: {onQueryStarted: clearDiscussionBodies},
  deleteDiscussionThread: {onQueryStarted: clearDiscussionBodies},
  updateDiscussionReply: {onQueryStarted: clearDiscussionBodies},
  deleteDiscussionReply: {onQueryStarted: clearDiscussionBodies},
  moderateDiscussionThread: {onQueryStarted: clearDiscussionBodies},
  moderateDiscussionReply: {onQueryStarted: clearDiscussionBodies},
 }
});

export const {usePatchBookClubScheduleMutation, useLazyGetDiscussionThreadQuery, useLazyGetDiscussionReplyQuery} = bookClubsApi;

export const {useGetBookClubsQuery, useGetArchivedBookClubsQuery, useGetBookClubQuery, useCreateBookClubMutation, useUpdateBookClubMutation, useJoinBookClubMutation, useArchiveBookClubMutation, useDeleteBookClubMutation, useGetBookClubMembersQuery, useUpdateBookClubMemberMutation, useRemoveBookClubMemberMutation, useTransferBookClubOwnershipMutation, useGetBookClubScheduleQuery, useUpdateBookClubScheduleMutation, useSetMilestoneMappingMutation, useClearMilestoneMappingMutation, useSetMilestoneProgressMutation, useGetReadingCopyQuery, useGetReadingCopyMatchesQuery, useConfirmReadingCopyMatchMutation, useSetReadingCopyMutation, useClearReadingCopyMutation, useGetDiscussionThreadsQuery, useCreateDiscussionThreadMutation, useGetDiscussionRepliesQuery, useCreateDiscussionReplyMutation, useUpdateDiscussionThreadMutation, useDeleteDiscussionThreadMutation, useUpdateDiscussionReplyMutation, useDeleteDiscussionReplyMutation, useModerateDiscussionThreadMutation, useModerateDiscussionReplyMutation, useGetDiscussionAuditQuery, useGetDiscussionRecoveryTargetsQuery} = bookClubsApi;
