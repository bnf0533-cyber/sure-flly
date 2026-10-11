import { Router } from "express";
import { createAuthController, registerUserController, loginUserController, getMeController } from "../controllers/auth.controller.js";
import { validate } from "../middleware/validate.middleware.js";
import { registerSchema, loginSchema } from "../validation/auth.valid.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = Router();
router.post("/register", validate(registerSchema), registerUserController);
router.post("/login", validate(loginSchema), loginUserController);
router.get("/me", authMiddleware, getMeController);

export default router;

export function createAuthRouter({ service, authMiddleware: customAuthMiddleware, authLimiter } = {}) {
    const r = Router();
    const controller = createAuthController(service);
    const m = customAuthMiddleware || authMiddleware;
    r.post(
        "/register",
        ...(authLimiter ? [authLimiter] : []),
        validate(registerSchema),
        controller.register
    );
    r.post("/login", ...(authLimiter ? [authLimiter] : []), validate(loginSchema), controller.login);
    r.get("/me", m, controller.me);
    return r;
}
