import {homebranchApi} from "@/shared/api/rtk-query";
import type {JobListResponse, JobModel} from "@/entities/job/model/JobModel";
import type {BookModel} from "@/entities/book";
import type {PaginationResult} from "@/shared/api/api_response";

export const jobsApi = homebranchApi.injectEndpoints({
    endpoints: (build) => ({
        getJobs: build.query<JobListResponse, { status?: string; queue?: string; limit?: number; offset?: number } | void>({
            query: (params) => {
                const searchParams = new URLSearchParams();
                if (params?.status) searchParams.set('status', params.status);
                if (params?.queue) searchParams.set('queue', params.queue);
                if (params?.limit) searchParams.set('limit', String(params.limit));
                if (params?.offset) searchParams.set('offset', String(params.offset));
                const qs = searchParams.toString();
                return {url: `/jobs${qs ? `?${qs}` : ''}`};
            },
            providesTags: ['Job'],
        }),
        getJobById: build.query<JobModel, string>({
            query: (id) => ({url: `/jobs/${id}`}),
            providesTags: (result) =>
                result ? [{type: 'Job' as const, id: result.id}] : [],
        }),
        triggerLibraryScan: build.mutation<{ jobId: string | undefined }, void>({
            query: () => ({url: '/library/scan', method: 'POST'}),
            invalidatesTags: ['Job'],
        }),
        triggerBookSync: build.mutation<{ jobId: string | undefined }, string>({
            query: (bookId) => ({url: `/library/books/${bookId}/sync`, method: 'POST'}),
            invalidatesTags: ['Job'],
        }),
        getUnownedBooks: build.query<PaginationResult<BookModel[]>, { limit?: number; offset?: number }>({
            query: ({limit = 20, offset = 0}) => ({
                url: `/library/unowned-books?limit=${limit}&offset=${offset}`,
            }),
            providesTags: [{type: 'Book', id: 'UNOWNED'}],
        }),
        getOrphanedBooks: build.mutation<PaginationResult<BookModel[]>, { knownUserIds: string[]; limit?: number; offset?: number }>({
            query: (body) => ({url: '/library/orphaned-books', method: 'POST', body}),
        }),
        bulkAssignBookOwner: build.mutation<{ assigned: number; failed: number; total: number }, { bookIds: string[]; userId: string | null }>({
            query: (body) => ({url: '/books/assign-owner', method: 'PATCH', body}),
            invalidatesTags: [{type: 'Book', id: 'UNOWNED'}, 'Book'],
        }),
        getLibrarySetting: build.query<{ key: string; value: string } | null, string>({
            query: (key) => ({url: `/settings/${key}`}),
            transformErrorResponse: () => null,
            providesTags: (_result, _error, key) => [{type: 'Book', id: `setting-${key}`}],
        }),
        upsertLibrarySetting: build.mutation<void, { key: string; value: string }>({
            query: ({key, value}) => ({url: `/settings/${key}`, method: 'PUT', body: {value}}),
            invalidatesTags: (_result, _error, {key}) => [{type: 'Book', id: `setting-${key}`}],
        }),
        getAdminBooks: build.query<PaginationResult<BookModel[]>, { limit?: number; offset?: number; query?: string }>({
            query: ({limit = 20, offset = 0, query}) => {
                const params = new URLSearchParams();
                params.set('limit', String(limit));
                params.set('offset', String(offset));
                if (query) params.set('query', query);
                return {url: `/books?${params.toString()}`};
            },
            providesTags: [{type: 'Book', id: 'ADMIN_LIST'}],
        }),
    }),
});

export const {
    useGetJobsQuery,
    useGetJobByIdQuery,
    useTriggerLibraryScanMutation,
    useTriggerBookSyncMutation,
    useGetUnownedBooksQuery,
    useGetOrphanedBooksMutation,
    useBulkAssignBookOwnerMutation,
    useGetLibrarySettingQuery,
    useUpsertLibrarySettingMutation,
    useGetAdminBooksQuery,
} = jobsApi;
