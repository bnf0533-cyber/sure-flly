import { verifyToken } from "../utils/token.js";
import { AppError } from "../utils/error.js";
import { getMeService } from "../services/auth.services.js";

export async function authMiddleware(req, _res, next) {
    const authorization = req.get("Authorization");
    if (!authorization?.startsWith("Bearer "))
        return next(
            new AppError(401, "UNAUTHORIZED", "Please sign in to continue.")
        );
    let payload;
    try {
        payload = verifyToken(authorization.slice(7), process.env.JWT_SECRET);
    } catch {
        return next(
            new AppError(
                401,
                "UNAUTHORIZED",
                "Your session has expired. Please sign in again."
            )
        );
    }
    try {
        req.user = await getMeService(payload.sub);
        next();
    } catch (error) {
        next(error);
    }
}

export function createAuthMiddleware({ jwtSecret = process.env.JWT_SECRET, authService } = {}) {
    return async function authenticate(req, res, next) {
        const authorization = req.get("Authorization");
        if (!authorization?.startsWith("Bearer "))
            return next(
                new AppError(401, "UNAUTHORIZED", "Please sign in to continue.")
            );
        let payload;
        try {
            payload = verifyToken(authorization.slice(7), jwtSecret);
        } catch {
            return next(
                new AppError(
                    401,
                    "UNAUTHORIZED",
                    "Your session has expired. Please sign in again."
                )
            );
        }
        try {
            req.user = authService ? await authService.getMe(payload.sub) : await getMeService(payload.sub);
            next();
        } catch (error) {
            next(error);
        }
    };
}
