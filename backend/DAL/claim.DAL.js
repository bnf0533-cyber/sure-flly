import { db } from "../db/config.db.js";
import { mapClaim } from "./mappers.js";

const selectClaim = (
    includePdf = false
) => `SELECT f.*, c.id AS claim_id, c.user_id, c.tracked_flight_id,
    c.flight_id, c.amount_ils, c.status AS claim_status, ${includePdf ? "c.pdf_buffer" : "NULL AS pdf_buffer"},
    c.mock_transaction_id, c.created_at AS claim_created_at, c.paid_at
    FROM claims c JOIN flights f ON f.id = c.flight_id`;

export async function listClaimsByUserDAL(userId, customDb = db) {
    const result = await customDb.query(
        `${selectClaim()} WHERE c.user_id = $1 ORDER BY c.created_at DESC`,
        [userId]
    );
    return result.rows.map(mapClaim);
}

export async function findClaimByIdDAL(id, customDb = db) {
    const result = await customDb.query(
        `${selectClaim(true)} WHERE c.id = $1`,
        [id]
    );
    return mapClaim(result.rows[0]);
}

export async function findClaimByTrackedFlightIdDAL(id, customDb = db) {
    const result = await customDb.query(
        `${selectClaim()} WHERE c.tracked_flight_id = $1`,
        [id]
    );
    return mapClaim(result.rows[0]);
}

export async function insertClaimDAL(
    { id, userId, trackedFlightId, flightId, amountIls, pdfBuffer = null },
    customDb = db
) {
    await customDb.query(
        `INSERT INTO claims (id,user_id,tracked_flight_id,flight_id,amount_ils,pdf_buffer)
VALUES ($1,$2,$3,$4,$5,decode($6,'base64'))`,
        [
            id,
            userId,
            trackedFlightId,
            flightId,
            amountIls,
            pdfBuffer?.toString("base64") ?? null,
        ]
    );
    return findClaimByIdDAL(id, customDb);
}

export async function updateClaimPaidDAL(
    id,
    { mockTransactionId, pdfBuffer, paidAt = new Date().toISOString() },
    customDb = db
) {
    await customDb.query(
        `UPDATE claims SET status = 'PAID', mock_transaction_id = $2,
pdf_buffer = decode($3,'base64'), paid_at = $4 WHERE id = $1`,
        [id, mockTransactionId, pdfBuffer.toString("base64"), paidAt]
    );
    return findClaimByIdDAL(id, customDb);
}

export function createClaimDAL(customDb = db) {
    return {
        listByUser: (userId) => listClaimsByUserDAL(userId, customDb),
        findById: (id) => findClaimByIdDAL(id, customDb),
        findByTrackedFlightId: (id) => findClaimByTrackedFlightIdDAL(id, customDb),
        create: (data) => insertClaimDAL(data, customDb),
        updatePaid: (id, data) => updateClaimPaidDAL(id, data, customDb),
    };
}
