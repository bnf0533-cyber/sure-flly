import { getData, postData } from "./api";
import type {
    AuthResult,
    LoginInput,
    RegisterInput,
    User,
} from "../types/users.types";

export const authService = {
    async login(input: LoginInput) {
        const result = await postData<AuthResult>("/auth/login", input);
        return result;
    },
    async register(input: RegisterInput) {
        const result = await postData<AuthResult>("/auth/register", input);
        return result;
    },
    async me() {
        const user = await getData<User>("/auth/me");
        return user;
    },
};
