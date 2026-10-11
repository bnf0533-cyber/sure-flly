import type { Flight } from "./flights.types";

export interface Claim {
    id: string;
    userId: string;
    trackedFlightId: string;
    flightId: string;
    amountIls: number;
    status: "PROCESSING" | "PAID";
    mockTransactionId: string | null;
    createdAt: string;
    paidAt: string | null;
    flight: Flight;
}
