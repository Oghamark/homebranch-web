import {axiosInstance} from "@/shared/api/axios";
import type {SavedPosition, SavePositionRequest} from "../types/SavedPosition";

function getUserId(): string {
    const userId = sessionStorage.getItem("user_id");
    if (!userId) throw new Error("User ID not found in session storage");
    return userId;
}

export async function getAllSavedPositions(): Promise<SavedPosition[]> {
    const userId = getUserId();
    const response = await axiosInstance.get(`/users/${userId}/saved-positions`);
    return response.data as SavedPosition[];
}

export async function getReadingBookIds(): Promise<string[]> {
    const userId = getUserId();
    const response = await axiosInstance.get<string[]>(`/users/${userId}/saved-positions/book-ids`);
    return response.data;
}

export async function getSavedPosition(bookId: string): Promise<SavedPosition | null> {
    const userId = getUserId();
    try {
        const response = await axiosInstance.get(`/users/${userId}/saved-positions/${bookId}`);
        return response.data as SavedPosition;
    } catch (error: any) {
        if (error.response?.status === 404) return null;
        throw error;
    }
}

export async function savePosition(bookId: string, request: SavePositionRequest): Promise<SavedPosition | undefined> {
    const userId = getUserId();
    const response = await axiosInstance.put(`/users/${userId}/saved-positions/${bookId}`, request);
    return response.data || undefined;
}

export async function deleteSavedPosition(bookId: string): Promise<void> {
    const userId = getUserId();
    await axiosInstance.delete(`/users/${userId}/saved-positions/${bookId}`);
}
