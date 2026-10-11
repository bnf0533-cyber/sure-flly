import { getMeUserService, updateMeUserService } from "../services/users.services.js";

export async function getMeController(req, res) {
    try {
        const user = await getMeUserService(req.user.id);
        return res.status(200).json({ data: user });
    } catch (error) {
        return res.status(error.statusCode || error.status || 500).json({
            error: { code: error.code || "USER_ERROR", message: error.message },
        });
    }
}

export async function updateMeController(req, res) {
    try {
        const user = await updateMeUserService(req.user.id, req.body);
        return res.status(200).json({ data: user });
    } catch (error) {
        return res.status(error.statusCode || error.status || 500).json({
            error: { code: error.code || "USER_ERROR", message: error.message },
        });
    }
}

export function createUsersController(service) {
    return {
        async me(req, res) {
            if (service) {
                const user = await service.getMe(req.user.id);
                return res.json({ data: user });
            }
            return getMeController(req, res);
        },
        async updateMe(req, res) {
            if (service) {
                const user = await service.updateMe(req.user.id, req.body);
                return res.json({ data: user });
            }
            return updateMeController(req, res);
        },
    };
}
