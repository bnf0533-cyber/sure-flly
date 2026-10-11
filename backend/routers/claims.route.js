import { Router } from "express";
import {
    createClaimsController,
    listClaimsController,
    getClaimByIdController,
    getClaimPdfController,
} from "../controllers/claims.controller.js";
import { validate } from "../middleware/validate.middleware.js";
import { claimParamsSchema } from "../validation/claims.valid.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = Router();
router.use(authMiddleware);
router.get("/", listClaimsController);
router.get("/:id/pdf", validate(claimParamsSchema, "params"), getClaimPdfController);
router.get("/:id", validate(claimParamsSchema, "params"), getClaimByIdController);

export default router;

export function createClaimsRouter(service) {
    const r = Router();
    const controller = createClaimsController(service);
    r.get("/", controller.list);
    r.get(
        "/:id/pdf",
        validate(claimParamsSchema, "params"),
        controller.pdf
    );
    r.get("/:id", validate(claimParamsSchema, "params"), controller.get);
    return r;
}
