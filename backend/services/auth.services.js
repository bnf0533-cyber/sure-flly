import { randomUUID } from "node:crypto";
import { db } from "../db/config.db.js";
import { getUserByEmail, getUserById, registerUser } from "../DAL/user.DAL.js";
import { AppError } from "../utils/error.js";
import { hashPassword, comparePassword } from "../utils/password.js";
import { signToken } from "../utils/token.js";

export function publicUser({ id, name, email, role, emailVerified }) {
    const user = { id, name, email, role, emailVerified: emailVerified === true };
    return user;
}

export async function registerUserService({ name, email, password }, customSecret, customDb = db) {
    const jwtSecret = customSecret || process.env.JWT_SECRET;
    const existing = await getUserByEmail(email, customDb);
    if (existing)
        throw new AppError(
            409,
            "EMAIL_IN_USE",
            "An account with this email already exists."
        );
    try {
        const user = await registerUser({
            id: randomUUID(),
            name,
            email,
            passwordHash: await hashPassword(password),
        }, customDb);
        const result = {
            user: publicUser(user),
            token: signToken(user, jwtSecret),
        };
        return result;
    } catch (error) {
        if (error.code === "23505")
            throw new AppError(
                409,
                "EMAIL_IN_USE",
                "An account with this email already exists."
            );
        throw error;
    }
}

export async function loginUserService(email, password, customSecret, customDb = db) {
    const jwtSecret = customSecret || process.env.JWT_SECRET;
    const user = await getUserByEmail(email, customDb);
    if (
        !user ||
        !(await comparePassword(password, user.passwordHash))
    ) {
        throw new AppError(
            401,
            "INVALID_CREDENTIALS",
            "Email or password is incorrect."
        );
    }
    const result = {
        user: publicUser(user),
        token: signToken(user, jwtSecret),
    };
    return result;
}

export async function getMeService(userId, customDb = db) {
    const user = await getUserById(userId, customDb);
    if (!user)
        throw new AppError(
            401,
            "UNAUTHORIZED",
            "Please sign in again."
        );
    return publicUser(user);
}

export function createAuthService({ db: customDb, jwtSecret } = {}) {
    return {
        register: (data) => registerUserService(data, jwtSecret, customDb),
        login: (data) => loginUserService(data.email, data.password, jwtSecret, customDb),
        getMe: (userId) => getMeService(userId, customDb),
    };
}
