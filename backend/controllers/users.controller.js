import { getMeUserService, updateMeUserService } from "../services/users.services.js";

export async function getMeController(req, res, next) {
    try {
        const user = await getMeUserService(req.user.id);
        return res.status(200).json({ data: user });
    } catch (error) {
        return next(error);
    }
}

export async function updateMeController(req, res, next) {
    try {
        const user = await updateMeUserService(req.user.id, req.body);
        return res.status(200).json({ data: user });
    } catch (error) {
        return next(error);
    }
}

export function createUsersController(service) {
    return {
        async me(req, res, next) {
            if (service) {
                const user = await service.getMe(req.user.id);
                return res.json({ data: user });
            }
            return getMeController(req, res, next);
        },
        async updateMe(req, res, next) {
            if (service) {
                const user = await service.updateMe(req.user.id, req.body);
                return res.json({ data: user });
            }
            return updateMeController(req, res, next);
        },
    };
}
