type ApiError = {
    code: number;
    message: string;
    timestamp: string;
    path: string;
}

export interface ApiErrorResponseDto {
    success: boolean;
    error: ApiError;
}

/**
 * Ensures type safety of error responses from axios
 */
export class ApiErrorResponse {
    constructor({success, error}: ApiErrorResponseDto) {
        this.success = success;
        this.error = error;
    }

    success: boolean;
    error: ApiError;
}
