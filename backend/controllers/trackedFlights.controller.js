import {
    listTrackedFlightsService,
    getTrackedFlightByIdService,
    registerTrackedFlightService,
    removeTrackedFlightService,
} from "../services/trackedFlights.services.js";

export async function listTrackedFlightsController(req, res) {
    try {
        const trackedFlights = await listTrackedFlightsService(req.user.id);
        return res.json({ data: trackedFlights });
    } catch (error) {
        return res.status(error.statusCode || error.status || 500).json({
            error: { code: error.code || "TRACKED_FLIGHTS_ERROR", message: error.message },
        });
    }
}

export async function getTrackedFlightByIdController(req, res) {
    try {
        const trackedFlight = await getTrackedFlightByIdService(req.user.id, req.params.id);
        return res.json({ data: trackedFlight });
    } catch (error) {
        return res.status(error.statusCode || error.status || 500).json({
            error: { code: error.code || "TRACKED_FLIGHTS_ERROR", message: error.message },
        });
    }
}

export async function registerTrackedFlightController(req, res) {
    try {
        const trackedFlight = await registerTrackedFlightService(req.user.id, req.body);
        return res.status(201).json({ data: trackedFlight });
    } catch (error) {
        return res.status(error.statusCode || error.status || 500).json({
            error: { code: error.code || "TRACKED_FLIGHTS_ERROR", message: error.message },
        });
    }
}

export async function removeTrackedFlightController(req, res) {
    try {
        await removeTrackedFlightService(req.user.id, req.params.id);
        return res.status(204).end();
    } catch (error) {
        return res.status(error.statusCode || error.status || 500).json({
            error: { code: error.code || "TRACKED_FLIGHTS_ERROR", message: error.message },
        });
    }
}

export function createTrackedFlightsController(service) {
    return {
        async list(req, res) {
            if (service) {
                const trackedFlights = await service.list(req.user.id);
                return res.json({ data: trackedFlights });
            }
            return listTrackedFlightsController(req, res);
        },
        async get(req, res) {
            if (service) {
                const trackedFlight = await service.getById(req.user.id, req.params.id);
                return res.json({ data: trackedFlight });
            }
            return getTrackedFlightByIdController(req, res);
        },
        async register(req, res) {
            if (service) {
                const trackedFlight = await service.register(req.user.id, req.body);
                return res.status(201).json({ data: trackedFlight });
            }
            return registerTrackedFlightController(req, res);
        },
        async remove(req, res) {
            if (service) {
                await service.remove(req.user.id, req.params.id);
                return res.status(204).end();
            }
            return removeTrackedFlightController(req, res);
        },
    };
}
