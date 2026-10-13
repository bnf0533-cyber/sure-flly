import cron from "node-cron";
import { createFlightDAL } from "../DAL/flight.DAL.js";

/** Activation is hourly; provider checks only ever run for ACTIVE_TRACKING flights. */
export function createFlightTracker({
    db,
    flightsService,
    provider,
    now = () => Date.now(),
    logger = console,
}) {
    const flights = createFlightDAL(db);
    let running = false;
    let active = Promise.resolve();
    let task;
    async function tick() {
        if (running) {
            return { skipped: true, checked: 0, failed: 0 };
        }
        running = true;
        let checked = 0;
        let failed = 0;
        try {
            // Include overdue pending flights after downtime; no lower cutoff on departure.
            await flights.activateEligible(
                new Date(now() + 86_400_000).toISOString()
            );
            for (const flight of await flights.listActive()) {
                try {
                    // Retry unfinished claim processing without polling a terminal flight again.
                    const observation = ["CANCELLED", "LANDED"].includes(flight.status)
                        ? { status: flight.status, delayMinutes: flight.delayMinutes }
                        : await provider.getStatus(flight);
                    await flightsService.updateStatus(flight.id, observation);
                    checked += 1;
                } catch (error) {
                    failed += 1;
                    logger.error("Flight tracking failed", {
                        flightId: flight.id,
                        message: error.message,
                    });
                }
            }
            return { skipped: false, checked, failed };
        } finally {
            running = false;
        }
    }
    const run = () => { if (running) return Promise.resolve({skipped:true,checked:0,failed:0}); active=tick(); return active; };
    return {
        tick:run,
        start() {
            if (task) {
                return;
            }
            task = cron.schedule(
                "0 * * * *",
                () =>
                    run().catch((error) =>
                        logger.error("Tracker failed", error.message)
                    ),
                { timezone: "UTC" }
            );
            void run().catch((error) =>
                logger.error("Initial tracker run failed", error.message)
            );
        },
        async stop() {
            task?.stop();
            task?.destroy();
            task = undefined;
            await active;
        },
    };
}
