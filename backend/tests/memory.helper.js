import { readFile } from 'node:fs/promises';
import pg from 'pg';

/** Create an isolated DB boundary. The in-memory mode is for local demos/tests only. */
export async function createDatabase({ connectionString, mode = 'postgres', ssl = false } = {}) {
  let memory;
  let pool;
  if (mode === 'memory') {
    const { newDb, DataType } = await import('pg-mem');
    memory = newDb({ autoCreateForeignKeyIndices: true });
    memory.public.registerFunction({ name: 'char_length', args: [DataType.text], returns: DataType.integer,
      implementation: (value) => Array.from(value).length });
    // pg-mem's pg adapter coerces Buffer parameters to UTF-8, corrupting PDF streams.
    // Match PostgreSQL's decode(text, 'base64') and preserve every binary byte.
    memory.public.registerFunction({ name: 'decode', args: [DataType.text, DataType.text], returns: DataType.bytea,
      implementation: (value, encoding) => {
        if (encoding !== 'base64') throw new Error('The demo database supports base64 decoding only');
        return Buffer.from(value, 'base64');
      } });
    const adapter = memory.adapters.createPg();
    pool = new adapter.Pool();
  } else {
    if (mode !== 'postgres') throw new Error('DB_MODE must be postgres or memory');
    if (!connectionString) throw new Error('DB_URL is required for PostgreSQL');
    pool = new pg.Pool({ connectionString, ssl, max: 10, connectionTimeoutMillis: 10000 });
    pool.on('error', (error) => console.error('Database pool error:', error.message));
  }

  // pg-mem does not implement rollback. Serialize memory access and snapshot each
  // transaction so failures restore all changes without erasing concurrent work.
  let pending = Promise.resolve();
  const serialize = (operation) => {
    const next = pending.then(operation, operation);
    pending = next.catch(() => undefined);
    return next;
  };
  const execute = (operation) => memory ? serialize(operation) : operation();
  const db = {
    query: (text, values) => execute(() => pool.query(text, values)),
    transaction: (callback) => execute(async () => {
      const client = await pool.connect();
      const backup = memory?.backup();
      try {
        if (!memory) await client.query('BEGIN');
        const result = await callback({ query: (text, values) => client.query(text, values) });
        if (!memory) await client.query('COMMIT');
        return result;
      } catch (error) {
        if (memory) backup.restore();
        else await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    }),
    migrate: async () => {
      const schema = await readFile(new URL('../db/schema.sql', import.meta.url), 'utf8');
      await db.query(schema);
      if (!memory) {
        const security = await readFile(new URL('./security.sql', import.meta.url), 'utf8');
        await db.query(security);
      }
    },
    close: () => execute(() => pool.end()),
  };
  return db;
}
