export interface User {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    role: "USER" | "ADMIN";
}

export interface AuthResult {
    user: User;
    token: string;
}
export interface LoginInput {
    email: string;
    password: string;
}
export interface RegisterInput extends LoginInput {
    name: string;
}
