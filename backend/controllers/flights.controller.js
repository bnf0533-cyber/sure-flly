import { listFlightsService, getFlightByIdService, updateFlightStatusService } from "../services/flights.services.js";

export async function listFlightsController(_req, res) {
    try {
        const flights = await listFlightsService();
        return res.json({ data: flights });
    } catch (error) {
        return res.status(error.statusCode || error.status || 500).json({
            error: { code: error.code || "FLIGHTS_ERROR", message: error.message },
        });
    }
}

export async function getFlightByIdController(req, res) {
    try {
        const flight = await getFlightByIdService(req.params.id);
        return res.json({ data: flight });
    } catch (error) {
        return res.status(error.statusCode || error.status || 500).json({
            error: { code: error.code || "FLIGHTS_ERROR", message: error.message },
        });
    }
}

export async function updateFlightStatusController(req, res) {
    try {
        const flight = await updateFlightStatusService(req.params.id, req.body);
        return res.json({ data: flight });
    } catch (error) {
        return res.status(error.statusCode || error.status || 500).json({
            error: { code: error.code || "FLIGHTS_ERROR", message: error.message },
        });
    }
}

export function createFlightsController(service) {
    return {
        async list(req, res) {
            if (service) {
                const flights = await service.list();
                return res.json({ data: flights });
            }
            return listFlightsController(req, res);
        },
        async get(req, res) {
            if (service) {
                const flight = await service.getById(req.params.id);
                return res.json({ data: flight });
            }
            return getFlightByIdController(req, res);
        },
        async updateStatus(req, res) {
            if (service) {
                const flight = await service.updateStatus(req.params.id, req.body);
                return res.json({ data: flight });
            }
            return updateFlightStatusController(req, res);
        },
    };
}
