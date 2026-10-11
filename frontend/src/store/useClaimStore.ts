import { create } from "zustand";
import { claimsService } from "../services/claims.service";
import { errorMessage } from "../services/api";
import type { Claim } from "../types/claims.types";

interface ClaimState {
    claims: Claim[];
    loading: boolean;
    loaded: boolean;
    error: string | null;
    epoch: number;
    request: number;
    setClaims: (claims: Claim[]) => void;
    fetch: () => Promise<void>;
    upsert: (claim: Claim) => void;
    reset: () => void;
}

export const useClaimStore = create<ClaimState>((set, get) => ({
    claims: [],
    loading: false,
    loaded: false,
    error: null,
    epoch: 0,
    request: 0,
    setClaims: (claims) => set({ claims, loaded: true, loading: false }),
    async fetch() {
        const epoch = get().epoch;
        const request = get().request + 1;
        set({ loading: true, error: null, request });
        try {
            const claims = await claimsService.list();
            if (get().epoch === epoch && get().request === request)
                set({ claims, loading: false, loaded: true });
        } catch (error) {
            if (get().epoch === epoch && get().request === request)
                set({
                    loading: false,
                    loaded: true,
                    error: errorMessage(error),
                });
        }
    },
    upsert(claim) {
        set((state) => ({
            claims: [
                claim,
                ...state.claims.filter((item) => item.id !== claim.id),
            ],
            request: state.request + 1,
        }));
        // An older HTTP snapshot must not overwrite this committed realtime approval.
        void get().fetch();
    },
    reset() {
        set((state) => ({
            claims: [],
            loading: false,
            loaded: false,
            error: null,
            epoch: state.epoch + 1,
            request: 0,
        }));
    },
}));
