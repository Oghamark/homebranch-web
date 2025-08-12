type ApiError = {
    code: number;
    message: string;
    timestamp: string;
    path: string;
}

export interface ApiErrorResponseDto {
    message: string[];
    error: string;
    statusCode: number;
}

/**
 * Ensures type safety of error responses from axios
 */
export class ApiErrorResponse {
    constructor({message, error, statusCode}: ApiErrorResponseDto) {
        this.message = message;
        this.error = error;
        this.statusCode = statusCode;
    }

    message: string[];
    error: string;
    statusCode: number;
}
