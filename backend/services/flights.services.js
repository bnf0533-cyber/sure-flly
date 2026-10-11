import { db } from "../db/config.db.js";
import {
    getAllFlightsDAL,
    getFlightByIdDAL,
    updateFlightStatusDAL,
    updateFlightTrackingStatusDAL,
    createFlightDAL,
} from "../DAL/flight.DAL.js";
import { notFound, AppError } from "../utils/error.js";
import { processFlightClaimsService } from "./claims.services.js";

export async function listFlightsService(customDb = db) {
    return getAllFlightsDAL(customDb);
}

export async function getFlightByIdService(id, customDb = db) {
    const flight = await getFlightByIdDAL(id, {}, customDb);
    if (!flight) {
        throw notFound("Flight not found");
    }
    return flight;
}

export async function updateFlightStatusService(
    id,
    { status, delayMinutes = 0 },
    { db: customDb = db, claimsService } = {}
) {
    if (
        !["SCHEDULED", "DELAYED", "CANCELLED", "LANDED"].includes(status) ||
        !Number.isInteger(delayMinutes) ||
        delayMinutes < 0
    ) {
        throw new AppError(400, "INVALID_STATUS", "Invalid flight status or delay");
    }
    const flight = await customDb.transaction(async (tx) => {
        const dal = createFlightDAL(tx);
        const current = await dal.findById(id, { forUpdate: true });
        if (!current) {
            throw notFound("Flight not found");
        }
        if (
            ["CANCELLED", "LANDED"].includes(current.status) &&
            current.status !== status
        ) {
            return current;
        }
        return dal.updateStatus(id, {
            status,
            delayMinutes,
            trackingStatus:
                current.trackingStatus === "COMPLETED"
                    ? "COMPLETED"
                    : current.trackingStatus,
        });
    });

    if (claimsService) {
        await claimsService.processFlight(id);
    } else {
        await processFlightClaimsService(id, { db: customDb });
    }

    if (["CANCELLED", "LANDED"].includes(flight.status)) {
        await updateFlightTrackingStatusDAL(id, "COMPLETED", customDb);
    }
    return getFlightByIdDAL(id, {}, customDb);
}

export function createFlightsService({ db: customDb = db, claimsService } = {}) {
    return {
        list: () => listFlightsService(customDb),
        getById: (id) => getFlightByIdService(id, customDb),
        updateStatus: (id, data) => updateFlightStatusService(id, data, { db: customDb, claimsService }),
    };
}
