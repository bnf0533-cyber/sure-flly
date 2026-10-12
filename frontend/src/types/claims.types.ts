import type { Flight } from "./flights.types";

export interface Claim {
    id: string;
    userId: string;
    trackedFlightId: string;
    flightId: string;
    amountIls: number;
    status: "PROCESSING" | "PAID" | "READY";
    mockTransactionId: string | null;
    createdAt: string;
    emailStatus: "NOT_QUEUED" | "PENDING" | "SENDING" | "SENT" | "FAILED" | "UNKNOWN";
    emailSentAt: string | null;
    emailError: string | null;
    emailAttempts: number;
    paidAt: string | null;
    flight: Flight;
}
