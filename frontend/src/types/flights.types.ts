export type FlightStatus = "SCHEDULED" | "DELAYED" | "CANCELLED" | "LANDED";
export type TrackingStatus = "PENDING_ACTIVE" | "ACTIVE_TRACKING" | "COMPLETED";

export interface FlightInput {
    flightNumber: string;
    airline: string;
    departureAirport: string;
    arrivalAirport: string;
    departureLat: number;
    departureLon: number;
    arrivalLat: number;
    arrivalLon: number;
    scheduledDeparture: string;
    scheduledArrival: string;
}

export interface Flight extends FlightInput {
    isDemo: boolean;
    id: string;
    distanceKm: number;
    trackingStatus: TrackingStatus;
    status: FlightStatus;
    delayMinutes: number;
    createdAt: string;
    updatedAt: string;
}

export interface TrackedFlight {
    id: string;
    userId: string;
    flightId: string;
    pnr: string;
    createdAt: string;
    flight: Flight;
}

export interface TrackFlightInput {
    pnr: string;
    flight: FlightInput;
}
export interface StatusUpdate {
    status: FlightStatus;
    delayMinutes: number;
}
