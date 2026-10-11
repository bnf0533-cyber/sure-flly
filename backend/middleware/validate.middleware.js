import { AppError } from "../utils/error.js";

export function validate(schema, source = "body") {
    return function validateRequest(req, _res, next) {
        const result = schema.safeParse(req[source]);
        if (!result.success) {
            return next(
                new AppError(
                    400,
                    "VALIDATION_ERROR",
                    "Please check the submitted information.",
                    result.error.issues.map(({ path, message }) => ({
                        field: path.join("."),
                        message,
                    }))
                )
            );
        }
        req[source] = result.data;
        next();
    };
}
