import { registerUserService, loginUserService, getMeService } from "../services/auth.services.js";

export async function registerUserController(req, res, next) {
    try {
        const result = await registerUserService(req.body);
        return res.status(201).json({ data: result });
    } catch (error) {
        return next(error);
    }
}

export async function loginUserController(req, res, next) {
    try {
        const { email, password } = req.body;
        const result = await loginUserService(email, password);
        return res.status(200).json({ data: result });
    } catch (error) {
        return next(error);
    }
}

export async function getMeController(req, res, next) {
    try {
        const user = await getMeService(req.user.id);
        return res.status(200).json({ data: user });
    } catch (error) {
        return next(error);
    }
}

export function createAuthController(service) {
    return {
        async register(req, res, next) {
            if (service) {
                const result = await service.register(req.body);
                return res.status(201).json({ data: result });
            }
            return registerUserController(req, res, next);
        },
        async login(req, res, next) {
            if (service) {
                const result = await service.login(req.body);
                return res.json({ data: result });
            }
            return loginUserController(req, res, next);
        },
        async me(req, res, next) {
            if (service) {
                const user = await service.getMe(req.user.id);
                return res.json({ data: user });
            }
            return getMeController(req, res, next);
        },
    };
}
