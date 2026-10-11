import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createDatabase } from "../db/config.db.js";
import { createFlightDAL } from "../DAL/flight.DAL.js";
import { createFlightTracker } from "../services/flightTracker.service.js";
import { createMockFlightProvider } from "../services/flightProvider.service.js";

const time = Date.parse("2026-10-08T12:00:00Z");
const flightInput = (hours, flightNumber) => ({
    id: randomUUID(),
    flightNumber,
    airline: "Test Air",
    departureAirport: "TLV",
    arrivalAirport: "LHR",
    departureLat: 32.0114,
    departureLon: 34.8867,
    arrivalLat: 51.47,
    arrivalLon: -0.4543,
    scheduledDeparture: new Date(time + hours * 3_600_000).toISOString(),
    scheduledArrival: new Date(time + (hours + 5) * 3_600_000).toISOString(),
    distanceKm: 3590,
    trackingStatus: "PENDING_ACTIVE",
});

test("hourly activation polls only the eligible window, includes overdue pending, isolates provider failures", async (t) => {
    const db = await createDatabase({ mode: "memory" });
    t.after(() => db.close());
    await db.migrate();
    const dal = createFlightDAL(db);
    const far = await dal.createOrFind(flightInput(24.01, "LY100"));
    const boundary = await dal.createOrFind(flightInput(24, "LY101"));
    const overdue = await dal.createOrFind(flightInput(-2, "LY102"));
    const polled = [];
    const updated = [];
    const errors = [];
    const tracker = createFlightTracker({
        db,
        now: () => time,
        provider: {
            async getStatus(flight) {
                polled.push(flight.id);
                if (flight.id === overdue.id)
                    throw new Error("Temporary provider error");
                return { status: "SCHEDULED", delayMinutes: 0 };
            },
        },
        flightsService: {
            async updateStatus(id) {
                updated.push(id);
            },
        },
        logger: { error: (...args) => errors.push(args) },
    });
    assert.deepEqual(await tracker.tick(), {
        skipped: false,
        checked: 1,
        failed: 1,
    });
    assert.deepEqual(new Set(polled), new Set([boundary.id, overdue.id]));
    assert.deepEqual(updated, [boundary.id]);
    assert.equal(errors.length, 1);
    assert.equal((await dal.findById(far.id)).trackingStatus, "PENDING_ACTIVE");
    assert.equal(
        (await dal.findById(boundary.id)).trackingStatus,
        "ACTIVE_TRACKING"
    );
});

test("overlapping scheduler ticks do not issue duplicate provider calls", async (t) => {
    const db = await createDatabase({ mode: "memory" });
    t.after(() => db.close());
    await db.migrate();
    await createFlightDAL(db).createOrFind(flightInput(1, "LY103"));
    let release;
    let entered;
    const providerStarted = new Promise((resolve) => {
        entered = resolve;
    });
    const providerResult = new Promise((resolve) => {
        release = resolve;
    });
    const tracker = createFlightTracker({
        db,
        now: () => time,
        provider: {
            async getStatus() {
                entered();
                return providerResult;
            },
        },
        flightsService: { async updateStatus() {} },
    });
    const first = tracker.tick();
    await providerStarted;
    assert.deepEqual(await tracker.tick(), {
        skipped: true,
        checked: 0,
        failed: 0,
    });
    release({ status: "SCHEDULED", delayMinutes: 0 });
    assert.equal((await first).checked, 1);
});

test("mock provider lands flights after their delayed estimated arrival", async () => {
    const provider = createMockFlightProvider({ now: () => time });
    const flight = {
        scheduledArrival: new Date(time - 30 * 60_000).toISOString(),
        status: "DELAYED",
        delayMinutes: 60,
    };
    assert.equal((await provider.getStatus(flight)).status, "DELAYED");
    assert.equal(
        (await provider.getStatus({ ...flight, delayMinutes: 0 })).status,
        "LANDED"
    );
    assert.equal(
        (await provider.getStatus({ ...flight, status: "CANCELLED" })).status,
        "CANCELLED"
    );
});
