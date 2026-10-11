import { Router } from "express";
import {
    createFlightsController,
    listFlightsController,
    getFlightByIdController,
    updateFlightStatusController,
} from "../controllers/flights.controller.js";
import { requireRole } from "../middleware/role.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { idParamsSchema, statusSchema } from "../validation/flights.valid.js";
import { AppError } from "../utils/error.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = Router();
router.use(authMiddleware);
router.get("/", listFlightsController);
router.get("/:id", validate(idParamsSchema, "params"), getFlightByIdController);
router.patch(
    "/:id/status",
    requireRole("ADMIN"),
    validate(idParamsSchema, "params"),
    validate(statusSchema),
    updateFlightStatusController
);

export default router;

export function createFlightsRouter(service, { providerName = "mock" } = {}) {
    const r = Router();
    const controller = createFlightsController(service);
    r.get("/", controller.list);
    r.get("/:id", validate(idParamsSchema, "params"), controller.get);
    r.patch(
        "/:id/status",
        requireRole("ADMIN"),
        function requireMockProvider(_req, _res, next) {
            if (providerName !== "mock") {
                return next(
                    new AppError(
                        403,
                        "MOCK_ONLY",
                        "Manual status updates are available only with the mock provider."
                    )
                );
            }
            next();
        },
        validate(idParamsSchema, "params"),
        validate(statusSchema),
        controller.updateStatus
    );
    return r;
}
