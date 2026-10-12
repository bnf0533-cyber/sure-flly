import clsx from "clsx";
import type { FlightStatus, TrackingStatus } from "../../types/flights.types";

type Status = FlightStatus | TrackingStatus | "PAID" | "PROCESSING" | "READY";
const labels: Record<Status, string> = {
    SCHEDULED: "מתוכנן",
    DELAYED: "מעוכב",
    CANCELLED: "בוטל",
    LANDED: "נחת",
    PENDING_ACTIVE: "מעקב מתוכנן",
    ACTIVE_TRACKING: "מעקב חי",
    COMPLETED: "מעקב הושלם",
    PAID: "תשלום מדומה הושלם",
    READY: "המסמכים מוכנים",
    PROCESSING: "בטיפול",
};

export function StatusBadge({ status }: { status: Status }) {
    return (
        <span
            className={clsx(
                "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold",
                {
                    "bg-teal-50 text-teal-700": [
                        "ACTIVE_TRACKING",
                        "PAID",
                        "LANDED",
                    ].includes(status),
                    "bg-amber-50 text-amber-800": [
                        "DELAYED",
                        "PROCESSING",
                    ].includes(status),
                    "bg-red-50 text-red-700": status === "CANCELLED",
                    "bg-slate-100 text-slate-600": [
                        "PENDING_ACTIVE",
                        "SCHEDULED",
                        "COMPLETED",
                    ].includes(status),
                }
            )}
        >
            <span
                className="h-1.5 w-1.5 rounded-full bg-current"
                aria-hidden="true"
            />
            {labels[status]}
        </span>
    );
}
