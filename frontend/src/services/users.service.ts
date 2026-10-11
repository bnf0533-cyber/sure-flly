import { patchData } from "./api";
import type { User } from "../types/users.types";

export const usersService = {
    async update(name: string) {
        const user = await patchData<User>("/users/me", { name });
        return user;
    },
};
