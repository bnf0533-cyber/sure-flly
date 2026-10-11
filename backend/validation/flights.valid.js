import { z } from "zod";

const airport = z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, "Use a three-letter IATA airport code.");
export const idParamsSchema = z.object({
    id: z.string().uuid("Invalid resource ID."),
});
export const flightSchema = z
    .object({
        flightNumber: z
            .string()
            .trim()
            .toUpperCase()
            .regex(
                /^[A-Z0-9]{2,3}[0-9]{1,4}[A-Z]?$/,
                "Use a flight number such as LY315 or BA163."
            ),
        airline: z.string().trim().min(2).max(100),
        departureAirport: airport,
        arrivalAirport: airport,
        departureLat: z.number().finite().min(-90).max(90),
        departureLon: z.number().finite().min(-180).max(180),
        arrivalLat: z.number().finite().min(-90).max(90),
        arrivalLon: z.number().finite().min(-180).max(180),
        scheduledDeparture: z.string().datetime({ offset: true }),
        scheduledArrival: z.string().datetime({ offset: true }),
    })
    .strict()
    .refine((value) => value.departureAirport !== value.arrivalAirport, {
        message: "Arrival and departure airports must differ.",
        path: ["arrivalAirport"],
    })
    .refine(
        (value) => new Date(value.scheduledDeparture).getTime() > Date.now(),
        {
            message: "Departure must be in the future.",
            path: ["scheduledDeparture"],
        }
    )
    .refine(
        (value) =>
            new Date(value.scheduledArrival).getTime() >
            new Date(value.scheduledDeparture).getTime(),
        {
            message: "Arrival must be after departure.",
            path: ["scheduledArrival"],
        }
    );

export const statusSchema = z
    .object({
        status: z.enum(["SCHEDULED", "DELAYED", "CANCELLED", "LANDED"]),
        delayMinutes: z.number().int().min(0).max(10080),
    })
    .strict()
    .refine(
        (value) => value.status !== "SCHEDULED" || value.delayMinutes === 0,
        {
            message: "A scheduled flight must have zero delay.",
            path: ["delayMinutes"],
        }
    );
