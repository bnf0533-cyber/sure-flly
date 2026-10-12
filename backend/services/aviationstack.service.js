// Translate Aviationstack responses into the fields our tracker already uses.
export function createAviationstackProvider({ apiKey, fetchFn = fetch } = {}) {
    if (!apiKey?.trim()) {
        throw new Error("Set AVIATIONSTACK_API_KEY in backend/.env before using aviationstack");
    }

    return {
        name: "aviationstack",
        async getStatus(flight) {
            const flightNumber = flight.flightNumber.replace(/\s/g, "").toUpperCase();
            const url = new URL("https://api.aviationstack.com/v1/flights");
            url.searchParams.set("access_key", apiKey.trim());
            url.searchParams.set("flight_iata", flightNumber);
            url.searchParams.set("dep_iata", flight.departureAirport);
            url.searchParams.set("arr_iata", flight.arrivalAirport);
            url.searchParams.set("limit", "100");

            let response;
            let body;
            try {
                response = await fetchFn(url, { signal: AbortSignal.timeout(10000) });
                body = await response.json();
            } catch {
                // Do not log the request URL: it contains the API key.
                throw new Error("Aviationstack request failed or timed out");
            }
            if (!response.ok || body?.error) {
                throw new Error("Aviationstack rejected the request. Check API key, plan and request quota (HTTP " + response.status + ")");
            }
            if (!Array.isArray(body?.data)) {
                throw new Error("Aviationstack returned an invalid response");
            }

            // The same flight number repeats daily. Never use another day's flight.
            const matches = body.data.filter((item) =>
                item?.flight?.iata === flightNumber &&
                item.departure?.iata === flight.departureAirport &&
                item.arrival?.iata === flight.arrivalAirport &&
                Date.parse(item.departure.scheduled) === Date.parse(flight.scheduledDeparture)
            );
            if (matches.length !== 1) {
                throw new Error("No unique Aviationstack flight matches this number, route and departure time");
            }
            const result = matches[0];
            if (!["scheduled", "active", "landed", "cancelled"].includes(result.flight_status)) {
                throw new Error("Aviationstack returned an unsupported flight status");
            }

            // Use arrival delay for compensation, never substitute departure delay.
            let delayMinutes = flight.delayMinutes ?? 0;
            const arrival = result.arrival;
            const arrivalTime = result.flight_status === "landed" ? arrival.actual : arrival.estimated;
            const difference = Date.parse(arrivalTime) - Date.parse(arrival.scheduled);
            if (Number.isFinite(difference)) {
                delayMinutes = Math.max(0, Math.floor(difference / 60000));
            } else if (arrival.delay !== null && arrival.delay !== undefined &&
                (typeof arrival.delay === "number" || (typeof arrival.delay === "string" && arrival.delay.trim() !== "")) && Number.isFinite(Number(arrival.delay)) && Number(arrival.delay) >= 0) {
                delayMinutes = Math.floor(Number(arrival.delay));
            } else if (result.flight_status !== "cancelled") {
                throw new Error("Aviationstack has no usable arrival delay yet");
            }

            let status = delayMinutes > 0 ? "DELAYED" : "SCHEDULED";
            if (result.flight_status === "cancelled") status = "CANCELLED";
            if (result.flight_status === "landed") status = "LANDED";
            return { status, delayMinutes };
        },
    };
}
