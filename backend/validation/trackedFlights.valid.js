import { z } from "zod";
import { flightSchema } from "./flights.valid.js";

export const registerTrackedFlightSchema = z
    .object({
        pnr: z
            .string()
            .trim()
            .toUpperCase()
            .regex(
                /^[A-Z0-9]{6}$/,
                "PNR must contain exactly six letters or numbers."
            ),
        flight: flightSchema,
    })
    .strict();
