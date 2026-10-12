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
import authRouter, { createAuthRouter } from "./routers/auth.route.js";
import usersRouter, { createUsersRouter } from "./routers/users.route.js";
import flightsRouter, { createFlightsRouter } from "./routers/flights.route.js";
import trackedFlightsRouter, { createTrackedFlightsRouter } from "./routers/trackedFlights.route.js";
import claimsRouter, { createClaimsRouter } from "./routers/claims.route.js";

// Middleware & Utilities
import { createAuthMiddleware } from "./middleware/auth.middleware.js";
import { errorHandler } from "./middleware/error.middleware.js";
import { verifyToken } from "./utils/token.js";
import { getUserById } from "./DAL/user.DAL.js";
import { appEvents } from "./utils/events.js";

// Background Flight Tracker
import { createFlightTracker } from "./services/flightTracker.service.js";
import { createMockFlightProvider } from "./services/flightProvider.service.js";
import { createAviationstackProvider } from "./services/aviationstack.service.js";
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
export const io = attachRealtime(server);

export function attachRealtime(httpServer, {
    jwtSecret = process.env.JWT_SECRET,
    clientOrigin = CLIENT_ORIGIN,
    authService = { getMe: getUserById },
    events = appEvents,
} = {}) {
    const socketServer = new Server(httpServer, { cors: { origin: clientOrigin } });
    socketServer.use(async (socket, next) => {
        try {
            const payload = verifyToken(socket.handshake.auth?.token, jwtSecret);
            const user = await authService.getMe(payload.sub);
            if (!user?.id) throw new Error("Unknown user");
            socket.data.user = user;
            socket.data.expiresAt = payload.exp * 1000;
            next();
        } catch { next(new Error("Unauthorized")); }
    });
    socketServer.on("connection", (socket) => {
        // Use the same room name as the claim notification below.
        socket.join("user:" + socket.data.user.id);
        const timer = setTimeout(() => socket.disconnect(true), Math.max(0, socket.data.expiresAt - Date.now()));
        timer.unref();
        socket.once("disconnect", () => clearTimeout(timer));
    });
    const notify = ({ userId, claim }) => {
        const { pdfBuffer, ...publicClaim } = claim;
        socketServer.to("user:" + userId).emit("CLAIM_APPROVED", publicClaim);
    };
    events.on("claim:approved", notify);
    socketServer.engine.on("close", () => events.off("claim:approved", notify));
    return socketServer;
}

// Choose the provider in .env. The tracker stays the same.
const providerName = process.env.NODE_TEST_CONTEXT ? "mock" : (process.env.FLIGHT_PROVIDER || "mock");
let provider;
if (providerName === "aviationstack") {
    provider = createAviationstackProvider({ apiKey: process.env.AVIATIONSTACK_API_KEY });
} else if (providerName === "mock") {
    provider = createMockFlightProvider();
} else {
    throw new Error("FLIGHT_PROVIDER must be mock or aviationstack");
}

// Flight Tracker background cron
const flightsService = createFlightsService({ db });
const tracker = createFlightTracker({
    db,
    flightsService,
    provider,
});

// Build a separate app when tests supply isolated services.
export function createApp({ db: customDb, services, jwtSecret, clientOrigin = CLIENT_ORIGIN, providerName = "mock" } = {}) {
    if (!services) return app;
    const testApp = express();
    testApp.use(helmet());
    testApp.use(cors({ origin: clientOrigin }));
    testApp.use(express.json());
    const authenticate = createAuthMiddleware({ jwtSecret, authService: services.auth });
    testApp.use("/api/auth", createAuthRouter({ service: services.auth, authMiddleware: authenticate }));
    testApp.use("/api/users", authenticate, createUsersRouter(services.users));
    testApp.use("/api/flights", authenticate, createFlightsRouter(services.flights, { providerName }));
    testApp.use("/api/trackedFlights", authenticate, createTrackedFlightsRouter(services.trackedFlights));
    testApp.use("/api/claims", authenticate, createClaimsRouter(services.claims));
    testApp.use(errorHandler);
    return testApp;
}

// Release the listener and database when stopping development.
let stopping = false;
async function stopServer() {
    if (stopping) return;
    stopping = true;
    tracker.stop();
    await new Promise((resolve) => io.close(resolve));
    await db.close();
}

// Start Server
if (process.env.NODE_ENV !== "test" && !process.env.NODE_TEST_CONTEXT) {
    process.once("SIGINT", () => stopServer().catch(console.error));
    process.once("SIGTERM", () => stopServer().catch(console.error));
    server.on("error", (error) => {
        console.error(error.code === "EADDRINUSE"
            ? "Port " + PORT + " is already in use. Stop the previous backend before restarting."
            : "Server failed: " + error.message);
        process.exitCode = 1;
        void stopServer().catch(console.error);
    });
    server.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        if (process.env.TRACKER_ENABLED !== "false") tracker.start();
    });
}
