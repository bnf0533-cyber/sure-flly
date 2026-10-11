import express from "express";
import cors from "cors";
import helmet from "helmet";
import { createServer } from "node:http";
import { Server } from "socket.io";
import "dotenv/config";

// Database
import "./db/config.db.js";
import { db } from "./db/config.db.js";

// Routers
import authRouter from "./routers/auth.route.js";
import usersRouter from "./routers/users.route.js";
import flightsRouter from "./routers/flights.route.js";
import trackedFlightsRouter from "./routers/trackedFlights.route.js";
import claimsRouter from "./routers/claims.route.js";

// Middleware & Utilities
import { errorHandler } from "./middleware/error.middleware.js";
import { verifyToken } from "./utils/token.js";
import { getUserById } from "./DAL/user.DAL.js";
import { appEvents } from "./utils/events.js";

// Background Flight Tracker
import { createFlightTracker } from "./services/flightTracker.service.js";
import { createMockFlightProvider } from "./services/flightProvider.service.js";
import { createFlightsService } from "./services/flights.services.js";

const PORT = process.env.PORT || 4000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";

export const app = express();
app.disable("x-powered-by");
app.use(helmet());
app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json());

// Health Check
app.get("/health", (_req, res) => {
    res.json({ data: { status: "ok", service: "sure-flight" } });
});

// API Routes
app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/flights", flightsRouter);
app.use("/api/trackedFlights", trackedFlightsRouter);
app.use("/api/claims", claimsRouter);

// Error Handling
app.use(errorHandler);

// HTTP & Socket.io Server
export const server = createServer(app);
export const io = new Server(server, {
    cors: { origin: CLIENT_ORIGIN },
});

// Socket Authentication
io.use(async (socket, next) => {
    try {
        const token = socket.handshake.auth?.token;
        if (!token) return next(new Error("Unauthorized"));
        const payload = verifyToken(token, process.env.JWT_SECRET);
        socket.data.user = await getUserById(payload.sub);
        next();
    } catch {
        next(new Error("Unauthorized"));
    }
});

io.on("connection", (socket) => {
    if (socket.data.user?.id) {
        socket.join(`user:${socket.data.user.id}`);
    }
});

// Listen for claim approvals to push to socket in real-time
appEvents.on("claim:approved", ({ userId, claim }) => {
    const { pdfBuffer: _pdf, ...publicClaim } = claim;
    io.to(`user:${userId}`).emit("CLAIM_APPROVED", publicClaim);
});

// Flight Tracker background cron
const flightsService = createFlightsService({ db });
const tracker = createFlightTracker({
    db,
    flightsService,
    provider: createMockFlightProvider(),
});

if (process.env.TRACKER_ENABLED !== "false" && process.env.NODE_ENV !== "test") {
    tracker.start();
}

// Helper exports for compatibility
export function createApp() {
    return app;
}
export function attachRealtime() {
    return io;
}

// Start Server
if (process.env.NODE_ENV !== "test") {
    server.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}
