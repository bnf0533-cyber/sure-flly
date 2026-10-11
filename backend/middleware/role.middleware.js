import { AppError } from "../utils/error.js";

export function requireRole(...roles) {
    return function checkRole(req, _res, next) {
        if (!req.user || !roles.includes(req.user.role))
            return next(
                new AppError(
                    403,
                    "FORBIDDEN",
                    "You do not have permission to perform this action."
                )
            );
        next();
    };
}
