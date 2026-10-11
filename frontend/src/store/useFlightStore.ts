import { create } from "zustand";
import { flightsService } from "../services/flights.service";
import { errorMessage } from "../services/api";
import type { TrackedFlight, TrackFlightInput } from "../types/flights.types";

interface FlightState {
    flights: TrackedFlight[];
    loading: boolean;
    loaded: boolean;
    error: string | null;
    epoch: number;
    request: number;
    setFlights: (flights: TrackedFlight[]) => void;
    fetch: () => Promise<void>;
    add: (input: TrackFlightInput) => Promise<TrackedFlight>;
    remove: (id: string) => Promise<void>;
    reset: () => void;
}

export const useFlightStore = create<FlightState>((set, get) => ({
    flights: [],
    loading: false,
    loaded: false,
    error: null,
    epoch: 0,
    request: 0,
    setFlights: (flights) => set({ flights, loaded: true, loading: false }),
    async fetch() {
        const epoch = get().epoch;
        const request = get().request + 1;
        set({ loading: true, error: null, request });
        try {
            const flights = await flightsService.list();
            if (get().epoch === epoch && get().request === request)
                set({ flights, loading: false, loaded: true });
        } catch (error) {
            if (get().epoch === epoch && get().request === request)
                set({
                    loading: false,
                    loaded: true,
                    error: errorMessage(error),
                });
        }
    },
    async add(input) {
        const epoch = get().epoch;
        const flight = await flightsService.track(input);
        if (get().epoch === epoch) {
            set((state) => ({
                flights: [
                    flight,
                    ...state.flights.filter((item) => item.id !== flight.id),
                ],
                request: state.request + 1,
            }));
            void get().fetch();
        }
        return flight;
    },
    async remove(id) {
        const epoch = get().epoch;
        await flightsService.untrack(id);
        if (get().epoch === epoch) {
            set((state) => ({
                flights: state.flights.filter((flight) => flight.id !== id),
                request: state.request + 1,
            }));
            void get().fetch();
        }
    },
    reset() {
        set((state) => ({
            flights: [],
            loading: false,
            loaded: false,
            error: null,
            epoch: state.epoch + 1,
            request: 0,
        }));
    },
}));
