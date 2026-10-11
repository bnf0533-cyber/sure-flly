import { api, getData, patchData, postData } from "./api";
import type {
    Flight,
    StatusUpdate,
    TrackedFlight,
    TrackFlightInput,
} from "../types/flights.types";

export const flightsService = {
    async list() {
        const trackedFlights =
            await getData<TrackedFlight[]>("/trackedFlights");
        return trackedFlights;
    },
    async track(input: TrackFlightInput) {
        const trackedFlight = await postData<TrackedFlight>(
            "/trackedFlights",
            input
        );
        return trackedFlight;
    },
    async untrack(id: string): Promise<void> {
        await api.delete(`/trackedFlights/${encodeURIComponent(id)}`);
    },
    async updateStatus(id: string, input: StatusUpdate) {
        const flight = await patchData<Flight>(
            `/flights/${encodeURIComponent(id)}/status`,
            input
        );
        return flight;
    },
};
