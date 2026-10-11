import { getUserById, updateUserName } from "../DAL/user.DAL.js";
import { notFound } from "../utils/error.js";
import { publicUser } from "./auth.services.js";

export async function getMeUserService(userId) {
    const user = await getUserById(userId);
    if (!user) {
        throw notFound("User not found.");
    }
    return publicUser(user);
}

export async function updateMeUserService(userId, { name }) {
    const user = await updateUserName(userId, name);
    if (!user) {
        throw notFound("User not found.");
    }
    return publicUser(user);
}

export function createUsersService({ db: _db } = {}) {
    return {
        getMe: (userId) => getMeUserService(userId),
        updateMe: (userId, data) => updateMeUserService(userId, data),
    };
}
