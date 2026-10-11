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
                    const observation = await provider.getStatus(flight);
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
    return {
        tick,
        start() {
            if (task) {
                return;
            }
            task = cron.schedule(
                "0 * * * *",
                () =>
                    tick().catch((error) =>
                        logger.error("Tracker failed", error.message)
                    ),
                { timezone: "UTC" }
            );
            void tick().catch((error) =>
                logger.error("Initial tracker run failed", error.message)
            );
        },
        stop() {
            task?.stop();
            task?.destroy();
            task = undefined;
        },
    };
}
