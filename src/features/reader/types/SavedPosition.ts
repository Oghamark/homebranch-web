export interface SavedPosition {
    bookId: string;
    userId: string;
    position: string;
    deviceName: string;
    createdAt: string;
    updatedAt: string;
}

export interface SavePositionRequest {
    position: string;
    deviceName: string;
}
