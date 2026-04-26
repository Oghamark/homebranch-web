export interface SavedPosition {
    bookId: string;
    userId: string;
    position: string;
    deviceName: string;
    percentage?: number | null;
    createdAt: string;
    updatedAt: string;
}

export interface SavePositionRequest {
    position: string;
    deviceName: string;
    percentage?: number;
}
