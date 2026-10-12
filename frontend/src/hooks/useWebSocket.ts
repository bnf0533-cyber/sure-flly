import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { useAuthStore } from "../store/authStore";
import { useClaimStore } from "../store/useClaimStore";
import { useFlightStore } from "../store/useFlightStore";
import { useNotificationStore } from "../store/useNotificationStore";
import type { Claim } from "../types/claims.types";

export function useWebSocket(): boolean {
    const token = useAuthStore((state) => state.token);
    const userId = useAuthStore((state) => state.user?.id);
    const [connected, setConnected] = useState(false);

    useEffect(() => {
        if (!token || !userId) {
            return;
        }
        const socket = io(
            import.meta.env.VITE_SOCKET_URL || window.location.origin,
            {
                auth: { token },
                transports: ["websocket", "polling"],
            }
        );
        const seen = new Set<string>();
        socket.on("connect", () => {
            setConnected(true);
            // Reconcile durable state after reconnects so missed events do not hide a claim.
            void useClaimStore.getState().fetch();
            void useFlightStore.getState().fetch();
        });
        socket.on("disconnect", () => setConnected(false));
        socket.on("connect_error", () => setConnected(false));
        socket.on("CLAIM_APPROVED", (claim: Claim) => {
            if (
                claim.userId !== userId ||
                useAuthStore.getState().token !== token
            )
                return;
            useClaimStore.getState().upsert(claim);
            void useFlightStore.getState().fetch();
            if (!seen.has(claim.id)) {
                seen.add(claim.id);
                useNotificationStore.getState().add({
                    type: "success",
                    title: claim.status === "READY" ? "המסמכים שלך מוכנים" : "הדגמת התביעה הושלמה",
                    message: claim.status === "READY" ? "ה-PDF זמין במסך התביעות. שם אפשר לבדוק את מצב שליחת המייל." : `A mock payout of ₪${Number(claim.amountIls).toLocaleString()} is ready. Your claim PDF is available under Claims.`,
                });
            }
        });
        return () => {
            socket.removeAllListeners();
            socket.disconnect();
            setConnected(false);
        };
    }, [token, userId]);

    return connected;
}
