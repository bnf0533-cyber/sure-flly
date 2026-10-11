export class AppError extends Error {
    constructor(statusCode, code, message, details) {
        super(message);
        this.name = "AppError";
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
    }
}

export function notFound(message = "Resource not found") {
    const error = new AppError(404, "NOT_FOUND", message);
    return error;
}
