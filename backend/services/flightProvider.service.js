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

