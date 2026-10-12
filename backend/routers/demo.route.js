import { Router } from "express";
import rateLimit from "express-rate-limit";
import { validate } from "../middleware/validate.middleware.js";
import { idParamsSchema, statusSchema } from "../validation/flights.valid.js";
import { createDemoFlight, updateDemoFlight, loadLiveExample } from "../services/demo.service.js";

// Authentication is applied in app.js. Every stored demo belongs to its creator.
export function createDemoRouter({ db, flightsService }) {
    const router = Router();
    router.use(rateLimit({ windowMs: 60000, limit: 20, standardHeaders: true, legacyHeaders: false }));
    router.get("/live", rateLimit({ windowMs: 60000, limit: 1, standardHeaders: true, legacyHeaders: false,
        message: { error: { message: "Wait one minute before another Aviationstack request" } } }), async (_req,res) => {
        res.json({ data: await loadLiveExample() });
    });
    router.post("/flights", async (req,res) => {
        res.status(201).json({ data: await createDemoFlight(db, req.user.id) });
    });
    router.patch("/flights/:id/status", validate(idParamsSchema,"params"), validate(statusSchema), async (req,res) => {
        res.json({ data: await updateDemoFlight(db, flightsService, req.user.id, req.params.id, req.body) });
    });
    return router;
}
