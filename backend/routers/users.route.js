import { Router } from "express";
import {
    createUsersController,
    getMeController,
    updateMeController,
} from "../controllers/users.controller.js";
import { validate } from "../middleware/validate.middleware.js";
import { updateUserSchema } from "../validation/users.valid.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = Router();
router.get("/me", authMiddleware, getMeController);
router.patch(
    "/me",
    authMiddleware,
    validate(updateUserSchema),
    updateMeController
);

export default router;

export function createUsersRouter(service) {
    const r = Router();
    const controller = createUsersController(service);
    r.get("/me", controller.me);
    r.patch("/me", validate(updateUserSchema), controller.updateMe);
    return r;
}
