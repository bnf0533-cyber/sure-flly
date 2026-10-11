import { db } from "../db/config.db.js";
import { mapUser } from "./mappers.js";

export async function getUserById(id, customDb = db) {
    const result = await customDb.query("SELECT * FROM users WHERE id = $1", [id]);
    return mapUser(result.rows[0]);
}

export async function getUserByEmail(email, customDb = db) {
    const result = await customDb.query("SELECT * FROM users WHERE email = $1", [email]);
    return mapUser(result.rows[0]);
}

export async function registerUser({ id, name, email, passwordHash, role = "USER" }, customDb = db) {
    const result = await customDb.query(
        "INSERT INTO users (id, name, email, password_hash, role) VALUES ($1, $2, $3, $4, $5) RETURNING *",
        [id, name, email, passwordHash, role]
    );
    return mapUser(result.rows[0]);
}

export async function updateUserName(id, name, customDb = db) {
    const result = await customDb.query(
        "UPDATE users SET name = $2 WHERE id = $1 RETURNING *",
        [id, name]
    );
    return mapUser(result.rows[0]);
}

export function createUserDAL(customDb = db) {
    return {
        findById: (id) => getUserById(id, customDb),
        findByEmail: (email) => getUserByEmail(email, customDb),
        create: (data) => registerUser(data, customDb),
        updateName: (id, name) => updateUserName(id, name, customDb),
    };
}
