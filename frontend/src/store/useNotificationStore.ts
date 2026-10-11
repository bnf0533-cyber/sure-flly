import { create } from "zustand";

interface Notification {
    id: string;
    title: string;
    message?: string;
    type: "success" | "error" | "info";
}
interface NotificationState {
    notifications: Notification[];
    add: (notification: Omit<Notification, "id">) => void;
    dismiss: (id: string) => void;
    reset: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
    notifications: [],
    add(notification) {
        const id = crypto.randomUUID();
        set((state) => ({
            notifications: [
                ...state.notifications.slice(-3),
                { ...notification, id },
            ],
        }));
        window.setTimeout(
            () =>
                set((state) => ({
                    notifications: state.notifications.filter(
                        (item) => item.id !== id
                    ),
                })),
            8000
        );
    },
    dismiss(id) {
        set((state) => ({
            notifications: state.notifications.filter((item) => item.id !== id),
        }));
    },
    reset() {
        set({ notifications: [] });
    },
}));
