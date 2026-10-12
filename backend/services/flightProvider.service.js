/** Provider contract: getStatus(flight) -> { status, delayMinutes }. No live API is called in mock mode. */
export function createMockFlightProvider({ now = () => Date.now() } = {}) {
    return {
        name: "mock",
        async getStatus(flight) {
            if (["CANCELLED", "LANDED"].includes(flight.status)) {
                const status = {
                    status: flight.status,
                    delayMinutes: flight.delayMinutes,
                };
                return status;
            }
            const estimatedArrival =
                new Date(flight.scheduledArrival).getTime() +
                flight.delayMinutes * 60_000;
            const status = {
                status: now() >= estimatedArrival ? "LANDED" : flight.status,
                delayMinutes: flight.delayMinutes,
            };
            return status;
        },
    };
}

/** Aviationstack live flight provider */
export function createAviationstackFlightProvider({
    apiKey = process.env.AVIATIONSTACK_API_KEY,
    fetchFn = fetch,
    logger = console,
} = {}) {
    return {
        name: "aviationstack",
        async getStatus(flight) {
            if (["CANCELLED", "LANDED"].includes(flight.status)) {
                return {
                    status: flight.status,
                    delayMinutes: flight.delayMinutes,
                };
            }

            if (!apiKey || apiKey === "YOUR_API_KEY_HERE") {
                logger.warn(
                    "AVIATIONSTACK_API_KEY is not configured, retaining flight status",
                    { flightNumber: flight.flightNumber }
                );
                return {
                    status: flight.status,
                    delayMinutes: flight.delayMinutes,
                };
            }

            const url = `http://api.aviationstack.com/v1/flights?access_key=${apiKey}&flight_iata=${encodeURIComponent(
                flight.flightNumber
            )}`;

            const res = await fetchFn(url);
            if (!res.ok) {
                throw new Error(`Aviationstack HTTP error: ${res.status}`);
            }

            const json = await res.json();
            if (json.error) {
                throw new Error(
                    `Aviationstack API error: ${json.error.message || json.error.code}`
                );
            }

            const item = json.data?.[0];
            if (!item) {
                return {
                    status: flight.status,
                    delayMinutes: flight.delayMinutes,
                };
            }

            const depDelay = Math.max(0, Math.round(item.departure?.delay || 0));
            const arrDelay = Math.max(0, Math.round(item.arrival?.delay || 0));
            const delayMinutes = Math.max(depDelay, arrDelay);

            const apiStatus = (item.flight_status || "").toLowerCase();
            let status = "SCHEDULED";
            if (apiStatus === "cancelled") {
                status = "CANCELLED";
            } else if (apiStatus === "landed") {
                status = "LANDED";
            } else if (delayMinutes > 0) {
                status = "DELAYED";
            }

            return {
                status,
                delayMinutes,
            };
        },
    };
}

/** Resolves flight provider based on FLIGHT_PROVIDER environment variable */
export function createFlightProviderFromEnv() {
    const providerName = (process.env.FLIGHT_PROVIDER || "mock").toLowerCase();
    if (providerName === "aviationstack") {
        return createAviationstackFlightProvider();
    }
    return createMockFlightProvider();
}

