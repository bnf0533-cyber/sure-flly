import { create } from "zustand";
import { persist } from "zustand/middleware";
import axios from "axios";
import { authService } from "../services/auth.service";
import { setAccessToken } from "../services/api";
import { useFlightStore } from "./useFlightStore";
import { useClaimStore } from "./useClaimStore";
import { useNotificationStore } from "./useNotificationStore";
import type { AuthResult, User } from "../types/users.types";

interface AuthState {
    user: User | null;
    token: string | null;
    ready: boolean;
    initializing: boolean;
    setSession: (session: AuthResult) => void;
    setUser: (user: User) => void;
    initialize: () => Promise<void>;
    logout: () => void;
}

function clearPrivateData(): void {
    useFlightStore.getState().reset();
    useClaimStore.getState().reset();
    useNotificationStore.getState().reset();
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            token: null,
            ready: false,
            initializing: false,
            setSession({ user, token }) {
                clearPrivateData();
                setAccessToken(token);
                set({ user, token, ready: true });
            },
            setUser(user) {
                set({ user });
            },
            async initialize() {
                if (get().ready || get().initializing) {
                    return;
                }
                const token = get().token;
                if (!token) {
                    set({ ready: true });
                    return;
                }
                setAccessToken(token);
                set({ initializing: true });
                try {
                    const user = await authService.me();
                    if (get().token === token) set({ user });
                } catch (error) {
                    if (
                        get().token === token &&
                        axios.isAxiosError(error) &&
                        error.response?.status === 401
                    )
                        get().logout();
                } finally {
                    set({ ready: true, initializing: false });
                }
            },
            logout() {
                setAccessToken(null);
                clearPrivateData();
                set({
                    user: null,
                    token: null,
                    ready: true,
                    initializing: false,
                });
            },
        }),
        {
            name: "sureflight-session",
            partialize: ({ user, token }) => {
                const session = { user, token };
                return session;
            },
        }
    )
);

export const useAuthState = useAuthStore;
