import { registerUserService, loginUserService, getMeService } from "../services/auth.services.js";

export async function registerUserController(req, res) {
    try {
        const result = await registerUserService(req.body);
        return res.status(201).json({ data: result });
    } catch (error) {
        return res.status(error.statusCode || error.status || 500).json({
            error: { code: error.code || "REGISTRATION_ERROR", message: error.message },
        });
    }
}

export async function loginUserController(req, res) {
    try {
        const { email, password } = req.body;
        const result = await loginUserService(email, password);
        return res.status(200).json({ data: result });
    } catch (error) {
        return res.status(error.statusCode || error.status || 500).json({
            error: { code: error.code || "LOGIN_ERROR", message: error.message },
        });
    }
}

export async function getMeController(req, res) {
    try {
        const user = await getMeService(req.user.id);
        return res.status(200).json({ data: user });
    } catch (error) {
        return res.status(error.statusCode || error.status || 500).json({
            error: { code: error.code || "AUTH_ERROR", message: error.message },
        });
    }
}

export function createAuthController(service) {
    return {
        async register(req, res) {
            if (service) {
                const result = await service.register(req.body);
                return res.status(201).json({ data: result });
            }
            return registerUserController(req, res);
        },
        async login(req, res) {
            if (service) {
                const result = await service.login(req.body);
                return res.json({ data: result });
            }
            return loginUserController(req, res);
        },
        async me(req, res) {
            if (service) {
                const user = await service.getMe(req.user.id);
                return res.json({ data: user });
            }
            return getMeController(req, res);
        },
    };
}
