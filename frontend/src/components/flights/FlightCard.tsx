import { useState } from "react";
import {
    CalendarDays,
    ChevronDown,
    Clock3,
    FlaskConical,
    Plane,
    Trash2,
    ShieldCheck,
} from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { useFlightStore } from "../../store/useFlightStore";
import { useClaimStore } from "../../store/useClaimStore";
import { useNotificationStore } from "../../store/useNotificationStore";
import { flightsService } from "../../services/flights.service";
import { errorMessage } from "../../services/api";
import type { FlightStatus, TrackedFlight } from "../../types/flights.types";
import {
    compensationEstimate,
    currency,
    delayLabel,
    localZone,
    shortDate,
} from "../../utils/format";
import { StatusBadge } from "../common/StatusBadge";
import { Button } from "../common/Button";
import { FlightRoute } from "./FlightRoute";

export function FlightCard({
    trackedFlight,
    detailed = false,
}: {
    trackedFlight: TrackedFlight;
    detailed?: boolean;
}) {
    const { flight, pnr, id } = trackedFlight;
    const isAdmin = useAuthStore((state) => state.user?.role === "ADMIN");
    const hasClaim = useClaimStore((state) =>
        state.claims.some((claim) => claim.trackedFlightId === id)
    );
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [busy, setBusy] = useState<string | null>(null);
    const notify = useNotificationStore((state) => state.add);

    async function remove() {
        setBusy("remove");
        try {
            await useFlightStore.getState().remove(id);
            notify({
                type: "success",
                title: "Flight removed from your workspace",
            });
        } catch (error) {
            notify({
                type: "error",
                title: "Could not remove flight",
                message: errorMessage(error),
            });
        } finally {
            setBusy(null);
            setConfirmDelete(false);
        }
    }

    async function simulate(status: FlightStatus) {
        setBusy(status);
        try {
            await flightsService.updateStatus(flight.id, {
                status,
                delayMinutes: status === "DELAYED" ? 480 : 0,
            });
            await Promise.all([
                useFlightStore.getState().fetch(),
                useClaimStore.getState().fetch(),
            ]);
            notify({
                type: "info",
                title: "Mock disruption recorded",
                message:
                    "Eligible claims are generated automatically. Check Claims for the latest status.",
            });
        } catch (error) {
            notify({
                type: "error",
                title: "Could not simulate disruption",
                message: errorMessage(error),
            });
        } finally {
            setBusy(null);
        }
    }

    return (
        <article className="card overflow-hidden">
            <div className="p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-ink">
                            <Plane size={17} />
                        </span>
                        <div>
                            <h3 className="text-sm font-semibold">
                                {flight.flightNumber}
                            </h3>
                            <p className="mt-0.5 text-[11px] text-muted">
                                {flight.airline}
                            </p>
                        </div>
                    </div>
                    <StatusBadge
                        status={
                            flight.status === "SCHEDULED"
                                ? flight.trackingStatus
                                : flight.status
                        }
                    />
                </div>
                <FlightRoute flight={flight} />
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-dashed border-line pt-4 text-[11px] text-muted">
                    <span className="inline-flex items-center gap-1.5">
                        <CalendarDays size={13} />
                        {shortDate(flight.scheduledDeparture)}
                    </span>
                    <span>
                        הזמנה{" "}
                        <span className="ml-1 font-mono font-semibold text-ink">
                            {pnr}
                        </span>
                    </span>
                </div>
                {flight.delayMinutes > 0 && (
                    <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-amber-800">
                        <Clock3 size={13} />
                        עיכוב מדווח: {delayLabel(flight.delayMinutes)}
                    </p>
                )}
                {detailed && (
                    <>
                        <div className="mt-4 flex items-center justify-between gap-3 rounded-lg bg-teal-50 px-3 py-2.5">
                            <span className="inline-flex items-center gap-1.5 text-[11px] text-teal-700">
                                <ShieldCheck size={14} />
                                הערכת פיצוי
                            </span>
                            <span className="text-sm font-semibold text-teal-700">
                                {currency(
                                    compensationEstimate(flight.distanceKm)
                                )}
                            </span>
                        </div>
                        <p className="mt-2 text-[10px] leading-relaxed text-muted">
                            ההערכה חלה על ביטולים או עיכובים של 8 שעות ומעלה תחת
                            הכללים המוגדרים. הזמנים מוצגים באזור הזמן{" "}
                            {localZone}.
                        </p>
                        <details className="mt-4 border-t border-line pt-3">
                            <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-medium text-muted">
                                פרטי טיסה ופעולות <ChevronDown size={14} />
                            </summary>
                            <div className="mt-4 space-y-4">
                                <dl className="grid grid-cols-2 gap-3 text-[11px]">
                                    <div>
                                        <dt className="text-muted">
                                            תאריך המראה
                                        </dt>
                                        <dd className="mt-1 font-medium">
                                            {shortDate(
                                                flight.scheduledDeparture
                                            )}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-muted">
                                            תאריך נחיתה
                                        </dt>
                                        <dd className="mt-1 font-medium">
                                            {shortDate(flight.scheduledArrival)}
                                        </dd>
                                    </div>
                                </dl>
                                {isAdmin && (
                                    <div className="rounded-lg border border-amber-100 bg-amber-50/70 p-3">
                                        <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-900">
                                            <FlaskConical size={14} />
                                            ספק מדומה · בקרות מנהל
                                        </p>
                                        <p className="mt-1 text-[11px] leading-relaxed text-amber-800">
                                            דמה שיבוש כדי לתרגל יצירת תביעה
                                            ותשלום מדומה. לא נוצר קשר עם שום
                                            חברת תעופה או מערכת תשלומים.
                                        </p>
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            <Button
                                                variant="secondary"
                                                className="min-h-8 px-2.5 py-1.5 text-[10px]"
                                                disabled={!!busy}
                                                loading={busy === "DELAYED"}
                                                onClick={() =>
                                                    void simulate("DELAYED")
                                                }
                                            >
                                                דמה עיכוב 8 שעות
                                            </Button>
                                            <Button
                                                variant="secondary"
                                                className="min-h-8 px-2.5 py-1.5 text-[10px]"
                                                disabled={!!busy}
                                                loading={busy === "CANCELLED"}
                                                onClick={() =>
                                                    void simulate("CANCELLED")
                                                }
                                            >
                                                דמה ביטול
                                            </Button>
                                        </div>
                                    </div>
                                )}
                                {hasClaim ? (
                                    <p className="text-[11px] text-muted">
                                        טיסה זו מקושרת לתביעה ולא ניתן להסירה.
                                    </p>
                                ) : confirmDelete ? (
                                    <div className="rounded-lg border border-red-100 bg-red-50 p-3">
                                        <p className="mb-3 text-xs text-red-800">
                                            להפסיק לעקוב אחר הזמנה זו ולהסירה
                                            מהטיסות שלך?
                                        </p>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="danger"
                                                loading={busy === "remove"}
                                                onClick={() => void remove()}
                                            >
                                                הסר טיסה
                                            </Button>
                                            <Button
                                                variant="secondary"
                                                disabled={!!busy}
                                                onClick={() =>
                                                    setConfirmDelete(false)
                                                }
                                            >
                                                שמור טיסה
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <Button
                                        variant="ghost"
                                        icon={<Trash2 size={13} />}
                                        disabled={!!busy}
                                        onClick={() => setConfirmDelete(true)}
                                        className="min-h-8 p-0 text-[11px]"
                                    >
                                        הסר טיסה
                                    </Button>
                                )}
                            </div>
                        </details>
                    </>
                )}
            </div>
        </article>
    );
}
