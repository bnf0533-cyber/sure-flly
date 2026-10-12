import pg from "pg";
import "dotenv/config";
import { readFile } from "node:fs/promises";

const DB_URL = process.env.DB_URL;
const isProduction = process.env.NODE_ENV === "production";
const pool = new pg.Pool({
    connectionString: DB_URL,
    ssl: process.env.DB_SSL === "true"
        ? {
            rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== undefined
                ? process.env.DB_SSL_REJECT_UNAUTHORIZED === "true"
                : isProduction,
            ...(process.env.DB_CA_CERT ? { ca: process.env.DB_CA_CERT } : {}),
            }
        : false,
    max: 10,
    connectionTimeoutMillis: 10000,
});

pool.on("error", (error) => {
    console.error("Database pool error:", error.message);
});

// chack the connection 
try {
    const client = await pool.connect();
    console.log("connected to postgres database successfully!");
    // dont catch connect for nothing
    client.release();
} catch (error) {
    console.error("failed to connect to database:", error.message);
    // stop process
    process.exit(1);
}

export const db = {
  // the will connection
    query: (text, params) => pool.query(text, params),
    async transaction(callback) {
        const client = await pool.connect();
        try {
            await client.query("BEGIN");
            const result = await callback(client);
            await client.query("COMMIT");
            return result;
        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        } finally {
            client.release();
        }
    },
    async migrate() {
        const schemaUrl = new URL("./schema.sql", import.meta.url);
        const sql = await readFile(schemaUrl, "utf-8");
        await pool.query(sql);
    },
    close: () => pool.end(),
};

export async function createDatabase() {
    return db;
}

export function getDatabase() {
    return db;
}
