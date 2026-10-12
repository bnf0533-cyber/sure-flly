import { randomUUID } from "node:crypto";
import { createFlightDAL } from "../DAL/flight.DAL.js";
import { createTrackedFlightDAL } from "../DAL/trackedFlight.DAL.js";
import { AppError } from "../utils/error.js";

// Real database records, explicitly marked as demo. No airline is contacted here.
export async function createDemoFlight(db, userId) {
    return db.transaction(async (tx) => {
        const existing = await tx.query("SELECT t.id FROM tracked_flights t JOIN flights f ON f.id = t.flight_id WHERE t.user_id = $1 AND f.is_demo = true ORDER BY t.created_at DESC LIMIT 1", [userId]);
        if (existing.rows[0]) {
            await tx.query("UPDATE flights SET flight_number = 'LY315', airline = 'אל על' WHERE id = (SELECT flight_id FROM tracked_flights WHERE id = $1)", [existing.rows[0].id]);
            return createTrackedFlightDAL(tx).findById(existing.rows[0].id);
        }
        const flight = await createFlightDAL(tx).createOrFind({
            id: randomUUID(), flightNumber: "LY315", airline: "אל על",
            departureAirport: "TLV", arrivalAirport: "LHR",
            departureLat: 32.0114, departureLon: 34.8867, arrivalLat: 51.47, arrivalLon: -0.4543,
            scheduledDeparture: new Date(Date.now()+3600000).toISOString(),
            scheduledArrival: new Date(Date.now()+6*3600000).toISOString(),
            distanceKm: 3593, trackingStatus: "ACTIVE_TRACKING",
        });
        await tx.query("UPDATE flights SET is_demo = true WHERE id = $1", [flight.id]);
        return createTrackedFlightDAL(tx).create({ id: randomUUID(), userId, flightId: flight.id, pnr: randomUUID().replaceAll("-", "").slice(0,6).toUpperCase() });
    });
}

export async function updateDemoFlight(db, flightsService, userId, trackedId, observation) {
    const tracked = await createTrackedFlightDAL(db).findById(trackedId);
    if (!tracked || tracked.userId !== userId) throw new AppError(404, "NOT_FOUND", "Demo flight not found");
    if (!tracked.flight.isDemo) throw new AppError(403, "DEMO_ONLY", "Only demo flights can be changed here");
    await flightsService.updateStatus(tracked.flightId, observation);
    return createTrackedFlightDAL(db).findById(trackedId);
}

export async function loadLiveExample() {
    const key = process.env.AVIATIONSTACK_API_KEY?.trim();
    if (!key) throw new AppError(503, "API_KEY_MISSING", "Set AVIATIONSTACK_API_KEY first");
    const url = new URL("https://api.aviationstack.com/v1/flights");
    url.searchParams.set("access_key", key);
    url.searchParams.set("flight_status", "active");
    url.searchParams.set("limit", "1");
    let response, body;
    try {
        response = await fetch(url, { signal: AbortSignal.timeout(10000) });
        body = await response.json();
    } catch { throw new AppError(502, "PROVIDER_UNAVAILABLE", "Aviationstack request failed or timed out"); }
    if (!response.ok || body?.error) throw new AppError(502, "PROVIDER_ERROR", "Check Aviationstack API key, plan and quota");
    const flight = body?.data?.[0];
    if (!flight) throw new AppError(404, "NO_LIVE_FLIGHT", "Aviationstack returned no active flight");
    return { source: "Aviationstack", receivedAt: new Date().toISOString(),
        flightNumber: flight.flight?.iata, airline: flight.airline?.name,
        status: flight.flight_status, departureAirport: flight.departure?.iata,
        arrivalAirport: flight.arrival?.iata, scheduledDeparture: flight.departure?.scheduled,
        scheduledArrival: flight.arrival?.scheduled, arrivalDelayMinutes: flight.arrival?.delay ?? null };
}
