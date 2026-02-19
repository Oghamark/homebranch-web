import {axiosInstance} from "@/shared/api/axios";
import type {SavedPosition} from "../types/SavedPosition";

function getUserId(): string {
    const userId = sessionStorage.getItem("user_id");
    if (!userId) throw new Error("User ID not found in session storage");
    return userId;
}

export async function getAllSavedPositions(): Promise<SavedPosition[]> {
    const userId = getUserId();
    const response = await axiosInstance.get(`/users/${userId}/saved-positions`);
    return response.data.value as SavedPosition[];
}

export async function getSavedPosition(bookId: string): Promise<SavedPosition | null> {
    const userId = getUserId();
    try {
        const response = await axiosInstance.get(`/users/${userId}/saved-positions/${bookId}`);
        return response.data.value as SavedPosition;
    } catch (error: any) {
        if (error.response?.status === 404) return null;
        throw error;
    }
}

export async function savePosition(bookId: string, position: string, deviceName: string): Promise<void> {
    const userId = getUserId();
    await axiosInstance.put(`/users/${userId}/saved-positions/${bookId}`, {position, deviceName});
}

export async function deleteSavedPosition(bookId: string): Promise<void> {
    const userId = getUserId();
    await axiosInstance.delete(`/users/${userId}/saved-positions/${bookId}`);
}
