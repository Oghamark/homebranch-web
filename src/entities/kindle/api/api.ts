import {homebranchApi} from "@/shared/api/rtk-query";

export type MailConfig = {
    configured: boolean;
    smtp: {
        host: string;
        port: number;
        secure: boolean;
        user?: string;
        from: string;
        hasPassword: boolean;
    } | null;
};

export type UpdateMailConfigRequest = {
    host: string;
    port: number;
    secure: boolean;
    user?: string;
    password?: string;
    from: string;
};

export type MailSender = { configured: boolean; sender: string | null };

export const kindleApi = homebranchApi.injectEndpoints({
    endpoints: (build) => ({
        getKindleEmail: build.query<{ kindleEmail: string | null }, void>({
            query: () => ({url: '/kindle/email'}),
            providesTags: ['KindleEmail'],
        }),
        updateKindleEmail: build.mutation<{ kindleEmail: string | null }, string | null>({
            query: (kindleEmail) => ({url: '/kindle/email', method: 'PUT', body: {kindleEmail}}),
            invalidatesTags: ['KindleEmail'],
        }),
        sendToKindle: build.mutation<{ success: boolean }, string>({
            query: (bookId) => ({url: `/books/${bookId}/send-to-kindle`, method: 'POST'}),
        }),
        getMailSender: build.query<MailSender, void>({
            query: () => ({url: '/mail/sender'}),
            providesTags: ['MailConfig'],
        }),
        getMailConfig: build.query<MailConfig, void>({
            query: () => ({url: '/mail/config'}),
            providesTags: ['MailConfig'],
        }),
        updateMailConfig: build.mutation<MailConfig, UpdateMailConfigRequest>({
            query: (body) => ({url: '/mail/config', method: 'PUT', body}),
            invalidatesTags: ['MailConfig'],
        }),
        sendTestMail: build.mutation<{ success: boolean }, string>({
            query: (to) => ({url: '/mail/test', method: 'POST', body: {to}}),
        }),
    }),
});

export const {
    useGetKindleEmailQuery,
    useUpdateKindleEmailMutation,
    useSendToKindleMutation,
    useGetMailSenderQuery,
    useGetMailConfigQuery,
    useUpdateMailConfigMutation,
    useSendTestMailMutation,
} = kindleApi;

export function getApiErrorMessage(error: unknown): string {
    const data = (error as { data?: { message?: string | string[] } })?.data;
    const message = Array.isArray(data?.message) ? data?.message.join(", ") : data?.message;
    return message ?? "Something went wrong";
}
