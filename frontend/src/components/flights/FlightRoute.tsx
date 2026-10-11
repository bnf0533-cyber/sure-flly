import { Plane } from "lucide-react";
import type { Flight } from "../../types/flights.types";
import { airportCity } from "../../utils/airports";
import { number, shortTime } from "../../utils/format";

export function FlightRoute({
    flight,
    compact = false,
}: {
    flight: Flight;
    compact?: boolean;
}) {
    return (
        <div
            className={`flex items-center justify-between gap-4 ${compact ? "py-4" : "py-6"}`}
        >
            <div className="min-w-0">
                <p
                    className={`${compact ? "text-2xl" : "text-[29px]"} font-semibold tracking-tight`}
                >
                    {flight.departureAirport}
                </p>
                <p className="mt-0.5 truncate text-xs text-muted">
                    {airportCity(flight.departureAirport)}
                </p>
                <p className="mt-2 text-xs font-semibold">
                    {shortTime(flight.scheduledDeparture)}
                </p>
            </div>
            <div className="max-w-44 flex-1 px-1 text-center">
                <p className="mb-3 text-[10px] text-muted">
                    {number(flight.distanceKm)} ק״מ
                </p>
                <div className="relative flex items-center">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full border border-slate-300" />
                    <span className="route-line w-full" />
                    <Plane
                        size={17}
                        className="absolute left-1/2 -translate-x-1/2 bg-white text-teal-600"
                    />
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-teal-500" />
                </div>
                <p className="mt-3 text-[10px] text-muted">מרחק</p>
            </div>
            <div className="min-w-0 text-right">
                <p
                    className={`${compact ? "text-2xl" : "text-[29px]"} font-semibold tracking-tight`}
                >
                    {flight.arrivalAirport}
                </p>
                <p className="mt-0.5 truncate text-xs text-muted">
                    {airportCity(flight.arrivalAirport)}
                </p>
                <p className="mt-2 text-xs font-semibold">
                    {shortTime(flight.scheduledArrival)}
                </p>
            </div>
        </div>
    );
}
