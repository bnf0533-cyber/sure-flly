import { db } from "../db/config.db.js";
import { mapFlight } from "./mappers.js";

export async function getAllFlightsDAL(customDb = db) {
    const result = await customDb.query(
        "SELECT * FROM flights ORDER BY scheduled_departure ASC LIMIT 200"
    );
    return result.rows.map(mapFlight);
}

export async function getFlightByIdDAL(id, { forUpdate = false } = {}, customDb = db) {
    const result = await customDb.query(
        `SELECT * FROM flights WHERE id = $1${forUpdate ? " FOR UPDATE" : ""}`,
        [id]
    );
    return mapFlight(result.rows[0]);
}

export async function getFlightByIdentityDAL(flightNumber, scheduledDeparture, customDb = db) {
    const result = await customDb.query(
        "SELECT * FROM flights WHERE flight_number = $1 AND scheduled_departure = $2",
        [flightNumber, scheduledDeparture]
    );
    return mapFlight(result.rows[0]);
}

export async function createOrFindFlightDAL(flight, customDb = db) {
    const result = await customDb.query(
        `
        INSERT INTO flights (id, flight_number, airline, departure_airport, arrival_airport,
        departure_lat, departure_lon, arrival_lat, arrival_lon, scheduled_departure,
        scheduled_arrival, distance_km, tracking_status)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
        ON CONFLICT (flight_number, scheduled_departure) DO UPDATE SET flight_number = EXCLUDED.flight_number
        RETURNING *`,
        [
            flight.id,
            flight.flightNumber,
            flight.airline,
            flight.departureAirport,
            flight.arrivalAirport,
            flight.departureLat,
            flight.departureLon,
            flight.arrivalLat,
            flight.arrivalLon,
            flight.scheduledDeparture,
            flight.scheduledArrival,
            flight.distanceKm,
            flight.trackingStatus,
        ]
    );
    return mapFlight(result.rows[0]);
}

export async function updateFlightStatusDAL(id, { status, delayMinutes, trackingStatus }, customDb = db) {
    const result = await customDb.query(
        `UPDATE flights SET status = $2, delay_minutes = $3,
        tracking_status = COALESCE($4, tracking_status), updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 RETURNING *`,
        [id, status, delayMinutes, trackingStatus ?? null]
    );
    return mapFlight(result.rows[0]);
}

export async function updateFlightTrackingStatusDAL(id, trackingStatus, customDb = db) {
    const result = await customDb.query(
        "UPDATE flights SET tracking_status = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *",
        [id, trackingStatus]
    );
    return mapFlight(result.rows[0]);
}

export async function activateEligibleFlightsDAL(cutoff, customDb = db) {
    const result = await customDb.query(
        `UPDATE flights SET tracking_status = 'ACTIVE_TRACKING', updated_at = CURRENT_TIMESTAMP
        WHERE tracking_status = 'PENDING_ACTIVE' AND scheduled_departure <= $1 RETURNING *`,
        [cutoff]
    );
    return result.rows.map(mapFlight);
}

export async function listActiveFlightsDAL(customDb = db) {
    const result = await customDb.query(
        "SELECT * FROM flights WHERE tracking_status = 'ACTIVE_TRACKING' ORDER BY scheduled_departure ASC"
    );
    return result.rows.map(mapFlight);
}

export function createFlightDAL(customDb = db) {
    return {
        list: () => getAllFlightsDAL(customDb),
        findById: (id, options) => getFlightByIdDAL(id, options, customDb),
        findByIdentity: (no, dep) => getFlightByIdentityDAL(no, dep, customDb),
        createOrFind: (flight) => createOrFindFlightDAL(flight, customDb),
        updateStatus: (id, data) => updateFlightStatusDAL(id, data, customDb),
        updateTrackingStatus: (id, status) => updateFlightTrackingStatusDAL(id, status, customDb),
        activateEligible: (cutoff) => activateEligibleFlightsDAL(cutoff, customDb),
        listActive: () => listActiveFlightsDAL(customDb),
    };
}
