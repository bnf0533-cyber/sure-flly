import { AppError } from "../utils/error.js";

export function errorHandler(error, _req, res, _next) {
    if (res.headersSent) {
        return _next(error);
    }
    if (error instanceof AppError) {
        return res.status(error.statusCode).json({
            error: {
                code: error.code,
                message: error.message,
                ...(error.details ? { details: error.details } : {}),
            },
        });
    }
    if (error.code === "23505") {
        return res.status(409).json({
            error: {
                code: "CONFLICT",
                message: "This record already exists.",
            },
        });
    }
    if (error.code === "23503") {
        return res.status(409).json({
            error: {
                code: "CONFLICT",
                message:
                    "This record is linked to another record and cannot be removed.",
            },
        });
    }
    if (error.type === "entity.parse.failed") {
        return res.status(400).json({
            error: {
                code: "INVALID_JSON",
                message: "The request body must contain valid JSON.",
            },
        });
    }
    if (error.type === "entity.too.large") {
        return res.status(413).json({
            error: {
                code: "PAYLOAD_TOO_LARGE",
                message: "The request body is too large.",
            },
        });
    }
    console.error("Request failed:", error.message);
    return res.status(500).json({
        error: {
            code: "INTERNAL_ERROR",
            message: "An unexpected error occurred. Please try again.",
        },
    });
}
