import {
    listTrackedFlightsService,
    getTrackedFlightByIdService,
    registerTrackedFlightService,
    removeTrackedFlightService,
} from "../services/trackedFlights.services.js";

export async function listTrackedFlightsController(req, res, next) {
    try {
        const trackedFlights = await listTrackedFlightsService(req.user.id);
        return res.json({ data: trackedFlights });
    } catch (error) {
        return next(error);
    }
}

export async function getTrackedFlightByIdController(req, res, next) {
    try {
        const trackedFlight = await getTrackedFlightByIdService(req.user.id, req.params.id);
        return res.json({ data: trackedFlight });
    } catch (error) {
        return next(error);
    }
}

export async function registerTrackedFlightController(req, res, next) {
    try {
        const trackedFlight = await registerTrackedFlightService(req.user.id, req.body);
        return res.status(201).json({ data: trackedFlight });
    } catch (error) {
        return next(error);
    }
}

export async function removeTrackedFlightController(req, res, next) {
    try {
        await removeTrackedFlightService(req.user.id, req.params.id);
        return res.status(204).end();
    } catch (error) {
        return next(error);
    }
}

export function createTrackedFlightsController(service) {
    return {
        async list(req, res, next) {
            if (service) {
                const trackedFlights = await service.list(req.user.id);
                return res.json({ data: trackedFlights });
            }
            return listTrackedFlightsController(req, res, next);
        },
        async get(req, res, next) {
            if (service) {
                const trackedFlight = await service.getById(req.user.id, req.params.id);
                return res.json({ data: trackedFlight });
            }
            return getTrackedFlightByIdController(req, res, next);
        },
        async register(req, res, next) {
            if (service) {
                const trackedFlight = await service.register(req.user.id, req.body);
                return res.status(201).json({ data: trackedFlight });
            }
            return registerTrackedFlightController(req, res, next);
        },
        async remove(req, res, next) {
            if (service) {
                await service.remove(req.user.id, req.params.id);
                return res.status(204).end();
            }
            return removeTrackedFlightController(req, res, next);
        },
    };
}
