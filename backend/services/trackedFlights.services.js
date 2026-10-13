
import { randomUUID } from "node:crypto";
import { db } from "../db/config.db.js";
import {
    createFlightDAL,
} from "../DAL/flight.DAL.js";
import {
    listTrackedFlightsByUserDAL,
    findTrackedFlightByIdDAL,
    createTrackedFlightDAL,
} from "../DAL/trackedFlight.DAL.js";
import { createClaimDAL } from "../DAL/claim.DAL.js";
import { calculateDistance } from "../utils/distance.js";
import { AppError, notFound } from "../utils/error.js";
import { processFlightClaimsInTransaction } from "./claims.services.js";

const DAY_MS = 24 * 60 * 60 * 1000;

export function initialTrackingStatus(scheduledDeparture, now = Date.now()) {
    const trackingStatus =
        new Date(scheduledDeparture).getTime() <= now + DAY_MS
            ? "ACTIVE_TRACKING"
            : "PENDING_ACTIVE";
    return trackingStatus;
}

export async function listTrackedFlightsService(userId, customDb = db) {
    return listTrackedFlightsByUserDAL(userId, customDb);
}

export async function getTrackedFlightByIdService(userId, id, customDb = db) {
    const tracked = await findTrackedFlightByIdDAL(id, customDb);
    if (!tracked || tracked.userId !== userId)
        throw notFound("Tracked flight not found");
    return tracked;
}

export async function registerTrackedFlightService(
    userId,
    { pnr, flight: input },
    { db: customDb = db, claimsService } = {}
) {
    const { tracked, paidClaims } = await customDb.transaction(async (tx) => {
        if (process.env.NODE_ENV === 'production') {
            await tx.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[userId]);
            const count = await tx.query('SELECT count(*) AS count FROM tracked_flights WHERE user_id=$1',[userId]);
            if (Number(count.rows[0].count) >= 100) throw new AppError(409,'FLIGHT_LIMIT','Maximum 100 tracked bookings per account.');
            if (!/^(LY|IZ)\d/.test(input.flightNumber)) throw new AppError(400,'UNSUPPORTED_AIRLINE','Supported airlines: EL AL (LY) and Arkia (IZ).');
        }
        const flights = createFlightDAL(tx);
        const distanceKm = calculateDistance(
            input.departureLat,
            input.departureLon,
            input.arrivalLat,
            input.arrivalLon
        );
        const flight = await flights.createOrFind({
            ...input,
            id: randomUUID(),
            distanceKm,
            trackingStatus: initialTrackingStatus(input.scheduledDeparture),
            status: "SCHEDULED",
            delayMinutes: 0,
        });
        if (flight.isDemo) throw new AppError(400, "DEMO_FLIGHT", "Demo flights cannot be registered by other passengers");
        const routeKeys = [
            "airline",
            "departureAirport",
            "arrivalAirport",
            "departureLat",
            "departureLon",
            "arrivalLat",
            "arrivalLon",
        ];
        if (
            routeKeys.some((key) => flight[key] !== input[key]) ||
            new Date(flight.scheduledArrival).getTime() !==
                new Date(input.scheduledArrival).getTime()
        ) {
            throw new AppError(
                409,
                "FLIGHT_CONFLICT",
                "This flight already exists with different route or schedule details"
            );
        }
        const createdTracked = await createTrackedFlightDAL(tx).create({
            id: randomUUID(),
            userId,
            flightId: flight.id,
            pnr: pnr.toUpperCase(),
        });

        const paid = claimsService
            ? await claimsService.processFlightInTransaction(tx, flight.id)
            : await processFlightClaimsInTransaction(tx, flight.id);

        return { tracked: createdTracked, paidClaims: paid };
    });

    if (claimsService) {
        claimsService.publishApprovals(paidClaims);
    }
    return findTrackedFlightByIdDAL(tracked.id, customDb);
}

export async function removeTrackedFlightService(userId, id, customDb = db) {
    await customDb.transaction(async (tx) => {
        const tracked = await createTrackedFlightDAL(tx).findById(id);
        if (!tracked || tracked.userId !== userId)
            throw notFound("Tracked flight not found");
        await createFlightDAL(tx).findById(tracked.flightId, {
            forUpdate: true,
        });
        if (await createClaimDAL(tx).findByTrackedFlightId(id)) {
            throw new AppError(
                409,
                "CLAIM_EXISTS",
                "A flight with a claim must be retained"
            );
        }
        await createTrackedFlightDAL(tx).remove(id, userId);
    });
}

export function createTrackedFlightsService({ db: customDb = db, claimsService } = {}) {
    return {
        list: (userId) => listTrackedFlightsService(userId, customDb),
        getById: (userId, id) => getTrackedFlightByIdService(userId, id, customDb),
        register: (userId, data) => registerTrackedFlightService(userId, data, { db: customDb, claimsService }),
        remove: (userId, id) => removeTrackedFlightService(userId, id, customDb),
    };
}
