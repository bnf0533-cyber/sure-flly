import { Router } from "express";
import {
    createTrackedFlightsController,
    listTrackedFlightsController,
    getTrackedFlightByIdController,
    registerTrackedFlightController,
    removeTrackedFlightController,
} from "../controllers/trackedFlights.controller.js";
import { validate } from "../middleware/validate.middleware.js";
import { idParamsSchema } from "../validation/flights.valid.js";
import { registerTrackedFlightSchema } from "../validation/trackedFlights.valid.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = Router();
router.use(authMiddleware);
router.get("/", listTrackedFlightsController);
router.post("/", validate(registerTrackedFlightSchema), registerTrackedFlightController);
router.get("/:id", validate(idParamsSchema, "params"), getTrackedFlightByIdController);
router.delete("/:id", validate(idParamsSchema, "params"), removeTrackedFlightController);

export default router;

export function createTrackedFlightsRouter(service) {
    const r = Router();
    const controller = createTrackedFlightsController(service);
    r.get("/", controller.list);
    r.post(
        "/",
        validate(registerTrackedFlightSchema),
        controller.register
    );
    r.get("/:id", validate(idParamsSchema, "params"), controller.get);
    r.delete(
        "/:id",
        validate(idParamsSchema, "params"),
        controller.remove
    );
    return r;
}
