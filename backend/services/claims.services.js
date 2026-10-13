import { buildAirlineMessage, getAirlineGuide } from "./airlineGuides.service.js";
import { randomUUID } from "node:crypto";
import { db } from "../db/config.db.js";
import {
    listClaimsByUserDAL,
    findClaimByIdDAL,
    findClaimByTrackedFlightIdDAL,
    insertClaimDAL,
    updateClaimPaidDAL,
    createClaimDAL,
} from "../DAL/claim.DAL.js";
import { createFlightDAL } from "../DAL/flight.DAL.js";
import { createTrackedFlightDAL } from "../DAL/trackedFlight.DAL.js";
import { createUserDAL } from "../DAL/user.DAL.js";
import { AppError, notFound } from "../utils/error.js";
import { generateClaimPdf, PDF_VERSION } from "../utils/pdfGenerator.js";
import { evaluateCompensation } from "./ruleEngine.service.js";
import { createMockPaymentGateway } from "./paymentGateway.service.js";
import { appEvents } from "../utils/events.js";


export function publicClaim(claim) {
    const { pdfBuffer: _pdf, ...safe } = claim;
    return safe;
}

export async function listClaimsService(userId, customDb = db) {
    const userClaims = await listClaimsByUserDAL(userId, customDb);
    return userClaims.map(publicClaim);
}

export async function getClaimByIdService(userId, id, customDb = db) {
    const claim = await findClaimByIdDAL(id, customDb);
    if (!claim || claim.userId !== userId)
        throw notFound("Claim not found");
    return publicClaim(claim);
}

export async function getClaimPdfService(userId, id, customDb = db) {
    const claim = await findClaimByIdDAL(id, customDb);
    if (!claim || claim.userId !== userId)
        throw notFound("Claim not found");
    if (!claim.pdfBuffer) {
        throw notFound("Claim package is not ready");
    }
    let buffer = Buffer.from(claim.pdfBuffer);
    // Rebuild legacy documents only; claim and payment records stay the same.
    if (!buffer.includes(Buffer.from(PDF_VERSION))) {
        const passenger = await createUserDAL(customDb).findById(userId);
        const tracked = await createTrackedFlightDAL(customDb).findById(claim.trackedFlightId);
        buffer = await generateClaimPdf({ claim, flight: claim.flight, passenger, pnr: tracked.pnr,
            reason: claim.flight.status === "CANCELLED" ? "CANCELLATION" : "DELAY_8_HOURS" });
        await customDb.query("UPDATE claims SET pdf_buffer = decode($2, 'base64') WHERE id = $1", [claim.id, buffer.toString("base64")]);
    }
    return {
        buffer,
        fileName: `SureFlight-${id}.pdf`,
    };
}

export async function getClaimInstructionsService(userId, id, customDb = db) {
    const claim = await findClaimByIdDAL(id, customDb);
    if (!claim || claim.userId !== userId) throw notFound('Claim not found');
    const guide = getAirlineGuide(claim.flight);
    if (!guide) throw new AppError(400, 'UNSUPPORTED_AIRLINE', 'Instructions are available for EL AL and Arkia.');
    const passenger = await createUserDAL(customDb).findById(userId);
    const tracked = await createTrackedFlightDAL(customDb).findById(claim.trackedFlightId);
    const message = buildAirlineMessage({ flight: claim.flight, passenger, pnr: tracked.pnr, guide });
    return { url: guide.url, subject: message.subject, text: message.text, letter: message.letter };
}

export async function autofillElAlClaimService(userId, id, customDb = db) {
    const claim = await findClaimByIdDAL(id, customDb);
    if (!claim || claim.userId !== userId)
        throw notFound("Claim not found");

    const passenger = await createUserDAL(customDb).findById(userId);
    const tracked = await createTrackedFlightDAL(customDb).findById(claim.trackedFlightId);

    if (process.env.NODE_ENV === 'production') throw new AppError(404, 'NOT_AVAILABLE', 'Use the airline instructions and official form.');
    const { launchElAlAutoFill } = await import('./elalAutomation.service.js');
    const result = await launchElAlAutoFill({
        passenger: passenger || { name: "נוסע", email: claim.emailTo || "" },
        flight: claim.flight,
        pnr: tracked?.pnr || "",
        claim,
    });

    return result;
}

export async function processFlightClaimsInTransaction(
    tx,
    flightId,
    {
        paymentGateway = createMockPaymentGateway(),
        pdfGenerator = generateClaimPdf,
        liveMode = !process.env.NODE_TEST_CONTEXT && process.env.FLIGHT_PROVIDER === "aviationstack",
    } = {}
) {
    const flight = await createFlightDAL(tx).findById(flightId, {
        forUpdate: true,
    });
    if (!flight) {
        throw notFound("Flight not found");
    }
    // Real flights produce an information package, never a simulated payment.
    const live = !flight.isDemo && liveMode;
    const decision = live
        ? { eligible: !!getAirlineGuide(flight) && (flight.status === "CANCELLED" || flight.delayMinutes > 0), amountIls: 0,
            reason: flight.status === "CANCELLED" ? "CANCELLATION" : "DELAY_REPORTED" }
        : evaluateCompensation(flight);
    if (!decision.eligible) {
        return [];
    }
    const claimDAL = createClaimDAL(tx);
    const registrations =
        await createTrackedFlightDAL(tx).listByFlight(flightId);
    const result = [];
    for (const tracked of registrations) {
        let claim = await claimDAL.findByTrackedFlightId(tracked.id);
        if (claim?.status === "PAID" || claim?.status === "READY") continue;
        if (!claim)
            claim = await claimDAL.create({
                id: randomUUID(),
                userId: tracked.userId,
                trackedFlightId: tracked.id,
                flightId,
                amountIls: decision.amountIls,
            });
        const passenger = await createUserDAL(tx).findById(tracked.userId);
        const pdfBuffer = await pdfGenerator({
            claim,
            flight,
            passenger,
            pnr: tracked.pnr,
            reason: decision.reason,
        });
        if (live) {
            const message = buildAirlineMessage({ flight, passenger, pnr: tracked.pnr });
            await tx.query("UPDATE claims SET email_subject=$2, email_text=$3, email_html=$4 WHERE id=$1", [claim.id, message.subject, message.text, message.html]);
            await tx.query("UPDATE claims SET status = 'READY', pdf_buffer = decode($2, 'base64'), email_status = 'PENDING', email_to = $3, email_updated_at = CURRENT_TIMESTAMP WHERE id = $1",
                [claim.id, pdfBuffer.toString("base64"), passenger.email]);
            result.push(publicClaim(await claimDAL.findById(claim.id)));
            continue;
        }
        const receipt = await paymentGateway.pay({
            idempotencyKey: `claim:${tracked.id}`,
            amountIls: claim.amountIls,
            userId: tracked.userId,
        });
        if (receipt.status !== "PAID" || !receipt.transactionId)
            throw new Error("Mock payment was not completed");
        const paid = await claimDAL.updatePaid(claim.id, {
            mockTransactionId: receipt.transactionId,
            pdfBuffer,
            paidAt: new Date().toISOString(),
        });
        result.push(publicClaim(paid));
    }
    return result;
}

export async function processFlightClaimsService(
    flightId,
    { db: customDb = db, events = appEvents, paymentGateway, pdfGenerator } = {}
) {
    const paidClaims = await customDb.transaction((tx) =>
        processFlightClaimsInTransaction(tx, flightId, { paymentGateway, pdfGenerator })
    );
    if (events) {
        for (const claim of paidClaims)
            events.emit("claim:approved", { userId: claim.userId, claim });
    }
    return paidClaims;
}

export function createClaimsService({
    db: customDb = db,
    events,
    paymentGateway = createMockPaymentGateway(),
    pdfGenerator = generateClaimPdf,
} = {}) {
    const claims = createClaimDAL(customDb);
    async function getOwned(userId, id) {
        const claim = await claims.findById(id);
        if (!claim || claim.userId !== userId)
            throw notFound("Claim not found");
        return claim;
    }
    const publishApprovals = (paidClaims) => {
        for (const claim of paidClaims)
            events?.emit("claim:approved", { userId: claim.userId, claim });
    };
    return {
        processFlightInTransaction: (tx, flightId) =>
            processFlightClaimsInTransaction(tx, flightId, { paymentGateway, pdfGenerator }),
        publishApprovals,
        list: (userId) => listClaimsService(userId, customDb),
        getById: (userId, id) => getClaimByIdService(userId, id, customDb),
        getPdf: (userId, id) => getClaimPdfService(userId, id, customDb),
        autofillElAl: (userId, id) => autofillElAlClaimService(userId, id, customDb),
        processFlight: (flightId) =>
            processFlightClaimsService(flightId, { db: customDb, events, paymentGateway, pdfGenerator }),
    };
}
