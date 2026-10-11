import test from "node:test";
import assert from "node:assert/strict";
import { calculateDistance } from "../utils/distance.js";
import {
    evaluateCompensation,
    evaluateRouteCompensation,
} from "../services/ruleEngine.service.js";
import { initialTrackingStatus } from "../services/trackedFlights.services.js";
import { createMockPaymentGateway } from "../services/paymentGateway.service.js";

test("Haversine handles coincident points, antipodes, symmetry, and invalid coordinates", () => {
    assert.equal(calculateDistance(32, 35, 32, 35), 0);
    assert.ok(Math.abs(calculateDistance(0, 0, 0, 180) - 20015.1144) < 0.001);
    assert.ok(
        Math.abs(calculateDistance(32.0114, 34.8867, 51.47, -0.4543) - 3593) <
            10
    );
    assert.equal(
        calculateDistance(32, 35, 40, -73),
        calculateDistance(40, -73, 32, 35)
    );
    assert.throws(() => calculateDistance(91, 0, 0, 0), RangeError);
    assert.throws(() => calculateDistance(0, NaN, 0, 0), RangeError);
});

test("exact eight hour delay and cancellation qualify, earlier delays do not", () => {
    assert.equal(
        evaluateCompensation({
            status: "DELAYED",
            delayMinutes: 479,
            distanceKm: 1000,
        }).amountIls,
        0
    );
    assert.equal(
        evaluateCompensation({
            status: "DELAYED",
            delayMinutes: 480,
            distanceKm: 1000,
        }).amountIls,
        1530
    );
    assert.equal(
        evaluateCompensation({
            status: "CANCELLED",
            delayMinutes: 0,
            distanceKm: 1000,
        }).amountIls,
        1530
    );
    assert.equal(
        evaluateCompensation({
            status: "LANDED",
            delayMinutes: 480,
            distanceKm: 1000,
        }).eligible,
        true
    );
});

test("distance tiers cover fractional boundaries without gaps or premature rounding", () => {
    for (const [distanceKm, amountIls] of [
        [0, 1530],
        [2000, 1530],
        [2000.001, 2450],
        [4500, 2450],
        [4500.001, 3670],
    ]) {
        assert.equal(
            evaluateCompensation({ status: "CANCELLED", distanceKm }).amountIls,
            amountIls
        );
    }
    assert.throws(
        () => evaluateCompensation({ status: "CANCELLED", distanceKm: -1 }),
        RangeError
    );
    const route = evaluateRouteCompensation({
        departureLat: 32.0114,
        departureLon: 34.8867,
        arrivalLat: 40.6413,
        arrivalLon: -73.7781,
        status: "CANCELLED",
    });
    assert.equal(route.amountIls, 3670);
});

test("activation includes the exact 24 hour boundary and overdue flights", () => {
    const now = Date.parse("2026-10-08T12:00:00Z");
    assert.equal(
        initialTrackingStatus("2026-10-09T12:00:00.001Z", now),
        "PENDING_ACTIVE"
    );
    assert.equal(
        initialTrackingStatus("2026-10-09T12:00:00.000Z", now),
        "ACTIVE_TRACKING"
    );
    assert.equal(
        initialTrackingStatus("2026-10-08T11:00:00Z", now),
        "ACTIVE_TRACKING"
    );
});

test("mock payout retries retain a stable transaction identity without moving money", async () => {
    const payload = {
        idempotencyKey: "claim:abc",
        userId: "passenger",
        amountIls: 2450,
    };
    const first = await createMockPaymentGateway().pay(payload);
    assert.deepEqual(await createMockPaymentGateway().pay(payload), first);
    assert.match(first.transactionId, /^mock_/);
    await assert.rejects(
        createMockPaymentGateway().pay({ ...payload, amountIls: -1 })
    );
});
