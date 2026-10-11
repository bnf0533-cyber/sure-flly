import { z } from "zod";

const email = z
    .string()
    .trim()
    .email()
    .max(254)
    .transform((value) => value.toLowerCase());
const password = z
    .string()
    .min(8, "Use at least 8 characters.")
    .max(72)
    .refine(
        (value) => Buffer.byteLength(value, "utf8") <= 72,
        "Password must use at most 72 bytes."
    );
export const registerSchema = z
    .object({ name: z.string().trim().min(2).max(100), email, password })
    .strict();
export const loginSchema = z
    .object({
        email,
        password: z
            .string()
            .min(1)
            .max(72)
            .refine(
                (value) => Buffer.byteLength(value, "utf8") <= 72,
                "Password must use at most 72 bytes."
            ),
    })
    .strict();
