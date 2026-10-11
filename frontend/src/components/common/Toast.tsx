import { CheckCircle2, Info, AlertCircle, X } from "lucide-react";
import { useNotificationStore } from "../../store/useNotificationStore";

export function Toast() {
    const { notifications, dismiss } = useNotificationStore();
    return (
        <div
            className="fixed bottom-20 right-4 z-50 flex w-[min(400px,calc(100vw-32px))] flex-col gap-3 md:bottom-6 md:right-6"
            aria-live="polite"
            aria-atomic="false"
        >
            {notifications.map((notification) => (
                <div
                    key={notification.id}
                    role={notification.type === "error" ? "alert" : "status"}
                    className="flex gap-3 rounded-2xl border border-line bg-white p-4 shadow-lg"
                >
                    {notification.type === "success" ? (
                        <CheckCircle2
                            size={21}
                            className="shrink-0 text-teal-600"
                        />
                    ) : notification.type === "error" ? (
                        <AlertCircle
                            size={21}
                            className="shrink-0 text-red-600"
                        />
                    ) : (
                        <Info size={21} className="shrink-0 text-blue-600" />
                    )}
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">
                            {notification.title}
                        </p>
                        {notification.message && (
                            <p className="mt-1 text-xs leading-relaxed text-muted">
                                {notification.message}
                            </p>
                        )}
                    </div>
                    <button
                        aria-label="Dismiss notification"
                        onClick={() => dismiss(notification.id)}
                        className="self-start rounded p-1 text-muted hover:bg-slate-100"
                    >
                        <X size={16} />
                    </button>
                </div>
            ))}
        </div>
    );
}
