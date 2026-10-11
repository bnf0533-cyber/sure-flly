import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plane, Plus, RefreshCw, Search } from "lucide-react";
import clsx from "clsx";
import { PageHeading } from "../components/common/PageHeading";
import { Button } from "../components/common/Button";
import { Loader } from "../components/common/Loader";
import { EmptyState, ErrorState } from "../components/common/States";
import { FlightCard } from "../components/flights/FlightCard";
import { useFlightStore } from "../store/useFlightStore";
import { localZone } from "../utils/format";

type Filter = "all" | "active" | "upcoming" | "completed";
const filters: { value: Filter; label: string }[] = [
    { value: "all", label: "כל הטיסות" },
    { value: "active", label: "מעקב חי" },
    { value: "upcoming", label: "מתוכנן" },
    { value: "completed", label: "הושלם" },
];

export default function TrackedFlightListPage() {
    const { flights, loading, loaded, error, fetch } = useFlightStore();
    const [filter, setFilter] = useState<Filter>("all");
    const [search, setSearch] = useState("");
    const visible = useMemo(
        () =>
            flights
                .filter(({ flight, pnr }) => {
                    const matchesFilter =
                        filter === "all" ||
                        (filter === "active" &&
                            flight.trackingStatus === "ACTIVE_TRACKING") ||
                        (filter === "upcoming" &&
                            flight.trackingStatus === "PENDING_ACTIVE") ||
                        (filter === "completed" &&
                            flight.trackingStatus === "COMPLETED");
                    const matchesSearch =
                        `${flight.flightNumber} ${flight.airline} ${flight.departureAirport} ${flight.arrivalAirport} ${pnr}`
                            .toLowerCase()
                            .includes(search.trim().toLowerCase());
                    return matchesFilter && matchesSearch;
                })
                .sort(
                    (a, b) =>
                        Date.parse(a.flight.scheduledDeparture) -
                        Date.parse(b.flight.scheduledDeparture)
                ),
        [flights, search, filter]
    );

    return (
        <div className="animate-rise">
            <PageHeading
                eyebrow="כל נסיעה, במקום אחד"
                title="הטיסות שלי"
                description="שמור את הנסיעות הקרובות ועדכוני הטיסה שלך יחד."
                action={
                    <Link to="/flights/new" className="btn btn-primary">
                        <Plus size={15} />
                        מעקב אחרי טיסה
                    </Link>
                }
            />
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div
                    className="flex max-w-full gap-1 overflow-x-auto rounded-xl border border-line bg-white p-1"
                    aria-label="Filter flights"
                >
                    {filters.map(({ value, label }) => (
                        <button
                            key={value}
                            aria-pressed={filter === value}
                            onClick={() => setFilter(value)}
                            className={clsx(
                                "whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium",
                                filter === value
                                    ? "bg-teal-50 text-teal-700"
                                    : "text-muted hover:bg-slate-50"
                            )}
                        >
                            {label}
                        </button>
                    ))}
                </div>
                <div className="flex w-full items-center gap-2 sm:w-auto">
                    <div className="relative flex-1">
                        <Search
                            size={15}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                        />
                        <input
                            className="input min-h-10 pl-9 text-xs sm:w-60"
                            type="search"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            aria-label="Search flights"
                            placeholder="חפש טיסה, נתיב או מספר הזמנה…"
                        />
                    </div>
                    <Button
                        variant="secondary"
                        loading={loading}
                        onClick={() => void fetch()}
                        aria-label="Refresh flights"
                        icon={<RefreshCw size={15} />}
                        className="px-3"
                    />
                </div>
            </div>
            {error && (
                <div className="mb-5">
                    <ErrorState message={error} onRetry={() => void fetch()} />
                </div>
            )}
            {!loaded ? (
                <div className="card">
                    <Loader />
                </div>
            ) : visible.length ? (
                <div className="grid items-start gap-5 lg:grid-cols-2 2xl:grid-cols-3">
                    {visible.map((flight) => (
                        <FlightCard
                            key={flight.id}
                            trackedFlight={flight}
                            detailed
                        />
                    ))}
                </div>
            ) : (
                <div className="card">
                    <EmptyState
                        icon={<Plane size={26} />}
                        title={
                            flights.length
                                ? "אין טיסות התואמות לחיפוש"
                                : "לאן אתה ממשיך עכשיו?"
                        }
                        description={
                            flights.length
                                ? "נסה מסנן אחר או חפש לפי מספר טיסה, שדה תעופה או מספר הזמנה."
                                : "הוסף את הטיסה שלך ומספר הזמנה. אנו נעקוב אחר הנסיעה שלך ונכין תביעות לשיבושים זכאים."
                        }
                        action={
                            flights.length ? (
                                <Button
                                    variant="secondary"
                                    onClick={() => {
                                        setFilter("all");
                                        setSearch("");
                                    }}
                                >
                                    נקה מסננים
                                </Button>
                            ) : (
                                <Link
                                    to="/flights/new"
                                    className="btn btn-primary"
                                >
                                    <Plus size={14} />
                                    עקוב אחר הטיסה הראשונה שלך
                                </Link>
                            )
                        }
                    />
                </div>
            )}
            <p className="mt-5 text-[11px] text-muted">
                הזמנים מוצגים באזור הזמן {localZone}. המעקב מופעל בתוך 24 שעות
                מהההמראה המתוכננת.
            </p>
        </div>
    );
}
