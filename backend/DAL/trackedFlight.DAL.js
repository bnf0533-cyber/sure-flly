import { db } from "../db/config.db.js";
import { mapTrackedFlight } from "./mappers.js";

const SELECT = `SELECT f.*, t.id AS tracked_id, t.user_id, t.flight_id, t.pnr,
    t.created_at AS tracked_created_at FROM tracked_flights t JOIN flights f ON f.id = t.flight_id`;

export async function listTrackedFlightsByUserDAL(userId, customDb = db) {
    const result = await customDb.query(
        `${SELECT} WHERE t.user_id = $1 ORDER BY f.scheduled_departure ASC`,
        [userId]
    );
    return result.rows.map(mapTrackedFlight);
}

export async function findTrackedFlightByIdDAL(id, customDb = db) {
    const result = await customDb.query(`${SELECT} WHERE t.id = $1`, [id]);
    return mapTrackedFlight(result.rows[0]);
}

export async function listTrackedFlightsByFlightDAL(flightId, customDb = db) {
    const result = await customDb.query(
        `${SELECT} WHERE t.flight_id = $1`,
        [flightId]
    );
    return result.rows.map(mapTrackedFlight);
}

export async function insertTrackedFlightDAL({ id, userId, flightId, pnr }, customDb = db) {
    await customDb.query(
        "INSERT INTO tracked_flights (id,user_id,flight_id,pnr) VALUES ($1,$2,$3,$4)",
        [id, userId, flightId, pnr]
    );
    return findTrackedFlightByIdDAL(id, customDb);
}

export async function removeTrackedFlightDAL(id, userId, customDb = db) {
    const result = await customDb.query(
        "DELETE FROM tracked_flights WHERE id = $1 AND user_id = $2",
        [id, userId]
    );
    return result.rowCount > 0;
}

export function createTrackedFlightDAL(customDb = db) {
    return {
        listByUser: (userId) => listTrackedFlightsByUserDAL(userId, customDb),
        findById: (id) => findTrackedFlightByIdDAL(id, customDb),
        listByFlight: (flightId) => listTrackedFlightsByFlightDAL(flightId, customDb),
        create: (data) => insertTrackedFlightDAL(data, customDb),
        remove: (id, userId) => removeTrackedFlightDAL(id, userId, customDb),
    };
}
