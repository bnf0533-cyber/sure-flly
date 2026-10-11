import "dotenv/config";
import { db } from "./config.db.js";

try {
    await db.migrate();
    console.log("Database schema migrated successfully.");
} finally {
    await db.close();
}
