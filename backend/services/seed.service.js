import { randomUUID } from "node:crypto";
import { createUserDAL } from "../DAL/user.DAL.js";
import { hashPassword } from "../utils/password.js";

/** Explicit opt-in demonstration data; never enable this on an exposed deployment. */
export async function seedDemo({ db, trackedFlightsService, flightsService }) {
    if (process.env.NODE_ENV === "production") {
        throw new Error("Demo seeding is strictly prohibited in production environment.");
    }
    const users = createUserDAL(db);
    const existingDemoUser = await users.findByEmail("demo@sureflight.local");
    if (existingDemoUser) {
        return;
    }
    const user = await users.create({
        id: randomUUID(),
        name: "Alex Morgan",
        email: "demo@sureflight.local",
        passwordHash: await hashPassword("SureFlight123!"),
        role: "USER",
    });
    const departureBase = Math.ceil(Date.now() / 3_600_000) * 3_600_000;
    const routes = [
        {
            flightNumber: "LY315",
            airline: "EL AL",
            arrivalAirport: "LHR",
            arrivalLat: 51.47,
            arrivalLon: -0.4543,
            hours: 6,
            duration: 5.5,
            pnr: "LHR6XA",
        },
        {
            flightNumber: "LY001",
            airline: "EL AL",
            arrivalAirport: "JFK",
            arrivalLat: 40.6413,
            arrivalLon: -73.7781,
            hours: 120,
            duration: 12,
            pnr: "NYC8QA",
        },
        {
            flightNumber: "A3929",
            airline: "Aegean Airlines",
            arrivalAirport: "ATH",
            arrivalLat: 37.9364,
            arrivalLon: 23.9445,
            hours: 18,
            duration: 2.2,
            pnr: "ATH2MX",
        },
    ];
    for (const route of routes) {
        const { hours, duration, pnr, ...destination } = route;
        const tracked = await trackedFlightsService.register(user.id, {
            pnr,
            flight: {
                ...destination,
                departureAirport: "TLV",
                departureLat: 32.0114,
                departureLon: 34.8867,
                scheduledDeparture: new Date(
                    departureBase + hours * 3_600_000
                ).toISOString(),
                scheduledArrival: new Date(
                    departureBase + (hours + duration) * 3_600_000
                ).toISOString(),
            },
        });
        if (route.flightNumber === "LY315")
            await flightsService.updateStatus(tracked.flightId, {
                status: "DELAYED",
                delayMinutes: 510,
            });
    }
}
