import { listFlightsService, getFlightByIdService, updateFlightStatusService } from "../services/flights.services.js";

export async function listFlightsController(_req, res) {
    try {
        const flights = await listFlightsService();
        return res.json({ data: flights });
    } catch (error) {
        return next(error);
    }
}

export async function getFlightByIdController(req, res, next) {
    try {
        const flight = await getFlightByIdService(req.params.id);
        return res.json({ data: flight });
    } catch (error) {
        return next(error);
    }
}

export async function updateFlightStatusController(req, res, next) {
    try {
        const flight = await updateFlightStatusService(req.params.id, req.body);
        return res.json({ data: flight });
    } catch (error) {
        return next(error);
    }
}

export function createFlightsController(service) {
    return {
        async list(req, res, next) {
            if (service) {
                const flights = await service.list();
                return res.json({ data: flights });
            }
            return listFlightsController(req, res, next);
        },
        async get(req, res, next) {
            if (service) {
                const flight = await service.getById(req.params.id);
                return res.json({ data: flight });
            }
            return getFlightByIdController(req, res, next);
        },
        async updateStatus(req, res, next) {
            if (service) {
                const flight = await service.updateStatus(req.params.id, req.body);
                return res.json({ data: flight });
            }
            return updateFlightStatusController(req, res, next);
        },
    };
}
