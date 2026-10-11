import { calculateDistance } from "../utils/distance.js";

export const COMPENSATION_TIERS = Object.freeze([
    Object.freeze({ maxDistanceKm: 2000, amountIls: 1530 }),
    Object.freeze({ maxDistanceKm: 4500, amountIls: 2450 }),
    Object.freeze({ maxDistanceKm: Infinity, amountIls: 3670 }),
]);
export const MINIMUM_DELAY_MINUTES = 480;

/** Product policy supplied for this prototype, not a complete statutory eligibility assessment. */
export function evaluateCompensation({ status, delayMinutes = 0, distanceKm }) {
    if (!Number.isFinite(distanceKm) || distanceKm < 0)
        throw new RangeError("Distance must be non-negative");
    if (!Number.isFinite(delayMinutes) || delayMinutes < 0)
        throw new RangeError("Delay must be non-negative");
    const eligible =
        status === "CANCELLED" || delayMinutes >= MINIMUM_DELAY_MINUTES;
    const tier = COMPENSATION_TIERS.find(
        ({ maxDistanceKm }) => distanceKm <= maxDistanceKm
    );
    const decision = {
        eligible,
        amountIls: eligible ? tier.amountIls : 0,
        currency: "ILS",
        distanceKm,
        reason: eligible
            ? status === "CANCELLED"
                ? "CANCELLATION"
                : "DELAY_8_HOURS"
            : "BELOW_THRESHOLD",
    };
    return decision;
}

export function evaluateRouteCompensation({
    departureLat,
    departureLon,
    arrivalLat,
    arrivalLon,
    ...disruption
}) {
    const decision = evaluateCompensation({
        ...disruption,
        distanceKm: calculateDistance(
            departureLat,
            departureLon,
            arrivalLat,
            arrivalLon
        ),
    });
    return decision;
}
