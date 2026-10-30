import {axiosInstance} from "@/shared/api/axios";
import type {PortableLocation} from "@/features/reader/types/PortableLocation";

export interface AnnotationAnchor {
    version: 1;
    href?: string;
    exact: string;
    prefix?: string;
    suffix?: string;
    native?: {pos0: string; pos1: string; domVersion?: number};
}
export interface Annotation {
    id: string;
    bookId: string;
    quote: string;
    note: string;
    color: string;
    anchor: AnnotationAnchor;
    deleted: boolean;
    revision: string;
    updatedAt: string;
}
export type AnnotationMutation = Pick<Annotation, "quote" | "note" | "color" | "anchor"> & {mutationId: string; deleted?: boolean};
export interface Device {
    id: string;
    name: string;
    createdAt: string;
    lastSeenAt: string | null;
    expiresAt: string;
}
export interface CrossReaderProgress {
    percentage: number;
    source: "web" | "koreader";
    accuracy: "exact" | "approximate";
    nativeProgress?: string;
    device: string;
    revision: string;
    updatedAt: string;
    location?: PortableLocation | null;
}
const bookPath = (id: string) => `/koreader/books/${encodeURIComponent(id)}`;
export const getDevices = async () => (await axiosInstance.get<Device[]>("/koreader/devices")).data;
export const approvePairing = async (userCode: string) => { await axiosInstance.post("/koreader/pairings/approve", {userCode}); };
export const revokeDevice = async (id: string) => { await axiosInstance.delete(`/koreader/devices/${encodeURIComponent(id)}`); };
export const getCrossReaderProgress = async (id: string) =>
    (await axiosInstance.get<CrossReaderProgress | null>(`${bookPath(id)}/progress`)).data;
export const getAnnotations = async (id: string, after: string) =>
    (await axiosInstance.get<{items: Annotation[]; cursor: string; hasMore?: boolean}>(`${bookPath(id)}/annotations`, {params: {after}})).data;
export const putAnnotation = async (bookId: string, id: string, mutation: AnnotationMutation) =>
    (await axiosInstance.put<Annotation>(`${bookPath(bookId)}/annotations/${encodeURIComponent(id)}`, mutation)).data;
