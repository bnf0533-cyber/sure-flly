import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
    ArrowLeft,
    ArrowRight,
    Check,
    Clock3,
    Info,
    Plane,
    ShieldCheck,
    Ticket,
} from "lucide-react";
import { PageHeading } from "../components/common/PageHeading";
import { Input } from "../components/common/Input";
import { Button } from "../components/common/Button";
import { ErrorState } from "../components/common/States";
import {
    AirportField,
    presetAirport,
} from "../components/flights/AirportField";
import { useFlightStore } from "../store/useFlightStore";
import { useNotificationStore } from "../store/useNotificationStore";
import { errorMessage } from "../services/api";
import {
    compensationEstimate,
    currency,
    distanceBetween,
    localZone,
    number,
    toLocalInput,
} from "../utils/format";

export default function TrackedFlightFormPage() {
    const navigate = useNavigate();
    const [flightNumber, setFlightNumber] = useState("");
    const [airline, setAirline] = useState("");
    const [pnr, setPnr] = useState("");
    const [departure, setDeparture] = useState(() => presetAirport("TLV"));
    const [arrival, setArrival] = useState(() => presetAirport("LHR"));
    const [departureTime, setDepartureTime] = useState("");
    const [arrivalTime, setArrivalTime] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const minDeparture = useMemo(() => toLocalInput(new Date()), []);
    const validCoordinates =
        [departure.lat, departure.lon, arrival.lat, arrival.lon].every(
            (value) => value !== "" && Number.isFinite(Number(value))
        ) &&
        Math.abs(Number(departure.lat)) <= 90 &&
        Math.abs(Number(arrival.lat)) <= 90 &&
        Math.abs(Number(departure.lon)) <= 180 &&
        Math.abs(Number(arrival.lon)) <= 180;
    const distance = validCoordinates
        ? distanceBetween(
              Number(departure.lat),
              Number(departure.lon),
              Number(arrival.lat),
              Number(arrival.lon)
          )
        : null;
    const startsSoon =
        departureTime &&
        new Date(departureTime).getTime() - Date.now() <= 86400000;

    async function submit(event: FormEvent) {
        event.preventDefault();
        setError(null);
        if (departure.code === arrival.code) {
            setError("Choose different departure and arrival airports.");
            return;
        }
        if (new Date(departureTime).getTime() <= Date.now()) {
            setError("Choose a departure time in the future.");
            return;
        }
        if (
            new Date(arrivalTime).getTime() <= new Date(departureTime).getTime()
        ) {
            setError(
                "Arrival must be after departure. Both times use your local timezone."
            );
            return;
        }
        if (!validCoordinates) {
            setError("Enter valid airport coordinates.");
            return;
        }
        setLoading(true);
        try {
            await useFlightStore.getState().add({
                pnr: pnr.toUpperCase(),
                flight: {
                    flightNumber: flightNumber.trim().toUpperCase(),
                    airline: airline.trim(),
                    departureAirport: departure.code,
                    arrivalAirport: arrival.code,
                    departureLat: Number(departure.lat),
                    departureLon: Number(departure.lon),
                    arrivalLat: Number(arrival.lat),
                    arrivalLon: Number(arrival.lon),
                    scheduledDeparture: new Date(departureTime).toISOString(),
                    scheduledArrival: new Date(arrivalTime).toISOString(),
                },
            });
            useNotificationStore
                .getState()
                .add({
                    type: "success",
                    title: "Your flight is on our radar",
                    message: startsSoon
                        ? "Live monitoring is ready for this journey."
                        : "Live monitoring will begin within 24 hours of departure.",
                });
            navigate("/flights");
        } catch (error) {
            setError(errorMessage(error));
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="animate-rise">
            <Link
                to="/flights"
                className="mb-5 inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-ink"
            >
                <ArrowLeft size={14} />
                חזרה לטיסות שלי
            </Link>
            <PageHeading
                eyebrow="דבר אחד פחות לחשוב עליו"
                title="בואו נעקוב אחר הטיסה שלך."
                description="הוסף את פרטי הנסיעה שלך. אנחנו ניקח את זה מכאן."
            />
            <div className="grid items-start gap-6 xl:grid-cols-[1.65fr_1fr]">
                <form
                    onSubmit={(event) => void submit(event)}
                    className="card overflow-hidden"
                >
                    <section className="border-b border-line p-6 sm:p-7">
                        <h2 className="mb-5 flex items-center gap-2.5 text-sm font-semibold">
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-teal-50 text-[11px] text-teal-700">
                                01
                            </span>
                            פרטי טיסה
                        </h2>
                        <div className="grid gap-5 sm:grid-cols-2">
                            <Input
                                label="מספר טיסה"
                                placeholder="למשל LY315"
                                value={flightNumber}
                                onChange={(event) =>
                                    setFlightNumber(
                                        event.target.value
                                            .toUpperCase()
                                            .replace(/\s/g, "")
                                    )
                                }
                                pattern="[A-Z0-9]{2,3}[0-9]{1,4}[A-Z]?"
                                maxLength={8}
                                hint="קוד חברת התעופה ואחריו מספר הטיסה."
                                required
                            />
                            <Input
                                label="חברת תעופה"
                                placeholder="למשל EL AL"
                                value={airline}
                                onChange={(event) =>
                                    setAirline(event.target.value)
                                }
                                minLength={2}
                                maxLength={100}
                                required
                            />
                        </div>
                    </section>
                    <section className="border-b border-line p-6 sm:p-7">
                        <h2 className="mb-5 flex items-center gap-2.5 text-sm font-semibold">
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-teal-50 text-[11px] text-teal-700">
                                02
                            </span>
                            הנתיב שלך
                        </h2>
                        <div className="grid gap-5 sm:grid-cols-2">
                            <AirportField
                                label="שדה תעופה המראה"
                                id="departure-airport"
                                value={departure}
                                onChange={setDeparture}
                            />
                            <AirportField
                                label="שדה תעופה נחיתה"
                                id="arrival-airport"
                                value={arrival}
                                onChange={setArrival}
                            />
                        </div>
                        <div className="mb-5 mt-6 flex gap-2 rounded-lg bg-blue-50 px-3 py-2.5 text-[11px] leading-relaxed text-blue-800">
                            <Info size={15} className="mt-0.5 shrink-0" />
                            <p>
                                הזן את שני הזמנים ב-<strong>{localZone}</strong>
                                , אזור הזמן של המכשיר שלך. המר מזמן מקומי של שדה
                                התעופה במידת הצורך. אנו שומרים את זמן ה-UTC
                                המדויק.
                            </p>
                        </div>
                        <div className="grid gap-5 sm:grid-cols-2">
                            <Input
                                label="המראה מתוכננת"
                                type="datetime-local"
                                value={departureTime}
                                min={minDeparture}
                                onChange={(event) =>
                                    setDepartureTime(event.target.value)
                                }
                                required
                            />
                            <Input
                                label="נחיתה מתוכננת"
                                type="datetime-local"
                                value={arrivalTime}
                                min={departureTime || minDeparture}
                                onChange={(event) =>
                                    setArrivalTime(event.target.value)
                                }
                                required
                            />
                        </div>
                    </section>
                    <section className="p-6 sm:p-7">
                        <h2 className="mb-5 flex items-center gap-2.5 text-sm font-semibold">
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-teal-50 text-[11px] text-teal-700">
                                03
                            </span>
                            מספר הזמנה
                        </h2>
                        <Input
                            label="PNR / מספר הזמנה"
                            placeholder="למשל ABC123"
                            icon={<Ticket size={16} />}
                            value={pnr}
                            onChange={(event) =>
                                setPnr(
                                    event.target.value
                                        .toUpperCase()
                                        .replace(/[^A-Z0-9]/gi, "")
                                        .slice(0, 6)
                                )
                            }
                            pattern="[A-Z0-9]{6}"
                            minLength={6}
                            maxLength={6}
                            className="font-mono tracking-widest"
                            autoComplete="off"
                            hint="מספר ההזמנה שלך בן 6 תווים נמצא באישור ההזמנה. ניתן לרשום כל שילוב של טיסה ו-PNR פעם אחת בלבד."
                            required
                        />
                        {error && (
                            <div className="mt-5">
                                <ErrorState message={error} />
                            </div>
                        )}
                        <div className="mt-7 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-5">
                            <Link to="/flights" className="btn btn-ghost">
                                ביטול
                            </Link>
                            <Button
                                type="submit"
                                loading={loading}
                                icon={<ArrowRight size={15} />}
                            >
                                התחל לעקוב
                            </Button>
                        </div>
                    </section>
                </form>
                <aside className="space-y-5 xl:sticky xl:top-6">
                    <section className="card p-6">
                        <p className="text-[10px] font-bold uppercase tracking-[.16em] text-muted">
                            תצוגה מקדימה של המסע
                        </p>
                        <div className="my-6 flex items-center gap-4">
                            <div>
                                <p className="text-3xl font-semibold tracking-tight">
                                    {departure.code || "—"}
                                </p>
                                <p className="mt-1 text-[10px] text-muted">
                                    המראה
                                </p>
                            </div>
                            <div className="relative flex-1">
                                <div className="route-line" />
                                <Plane
                                    size={19}
                                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white text-teal-600"
                                />
                            </div>
                            <div className="text-right">
                                <p className="text-3xl font-semibold tracking-tight">
                                    {arrival.code || "—"}
                                </p>
                                <p className="mt-1 text-[10px] text-muted">
                                    נחיתה
                                </p>
                            </div>
                        </div>
                        <dl className="space-y-4 border-t border-line pt-5 text-xs">
                            <div className="flex justify-between">
                                <dt className="text-muted">מרחק</dt>
                                <dd className="font-semibold">
                                    {distance === null
                                        ? "—"
                                        : `${number(distance)} ק"מ`}
                                </dd>
                            </div>
                            <div className="flex justify-between">
                                <dt className="text-muted">הערכת פיצוי</dt>
                                <dd className="font-semibold text-teal-700">
                                    {distance === null
                                        ? "—"
                                        : currency(
                                              compensationEstimate(distance)
                                          )}
                                </dd>
                            </div>
                        </dl>
                        <p className="mt-5 rounded-lg bg-teal-50 px-3 py-2.5 text-[11px] leading-relaxed text-teal-700">
                            ההערכה חלה רק במקרה של ביטול או עיכוב של לפחות 8
                            שעות על פי כללי ההדגמה.
                        </p>
                    </section>
                    <section className="rounded-2xl border border-line bg-white/50 p-6">
                        <Clock3 size={21} className="mb-3 text-teal-600" />
                        <h2 className="text-sm font-semibold">בדיוק בזמן.</h2>
                        <p className="mt-2 text-xs leading-6 text-muted">
                            אנו מחשבים את המרחק של הטיסה שלך באופן מיידי. בדיקות
                            סטטוס בזמן אמת מתחילות 24 שעות לפני ההמראה, כך
                            שהמעקב מתבצע מתי שזה משנה.
                        </p>
                        <div className="mt-5 space-y-3">
                            {[
                                "בדיקות הפעלה מדי שעה",
                                "קובץ תביעה אוטומטי ב-PDF לשיבושים זכאים",
                                "עדכונים מועברים ישירות לסביבת העבודה שלך",
                            ].map((text) => (
                                <p
                                    key={text}
                                    className="flex items-start gap-2 text-[11px] text-muted"
                                >
                                    <Check
                                        size={13}
                                        className="shrink-0 text-teal-600"
                                    />
                                    {text}
                                </p>
                            ))}
                        </div>
                    </section>
                    <p className="flex items-start gap-2 px-2 text-[10px] leading-relaxed text-muted">
                        <ShieldCheck size={15} className="shrink-0" />
                        הדגמה זו משתמשת בשלבי פיצוי מוגדרים ובתשלומים מדומים.
                        היא אינה קובעת את הזכויות המשפטיות שלך או מגישה תביעות
                        לחברת תעופה.
                    </p>
                </aside>
            </div>
        </div>
    );
}
