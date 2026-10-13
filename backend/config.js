import 'dotenv/config';
import { existsSync } from 'node:fs';
export function validateProduction(env = process.env) {
    if (env.NODE_ENV !== 'production') return;
    const fail = key => { throw new Error('Invalid production configuration: ' + key); };
    for (const key of ['DB_URL','JWT_SECRET','CLIENT_ORIGIN','AVIATIONSTACK_API_KEY','SMTP_USER','SMTP_PASS','PDF_FONT_PATH']) if (!env[key]?.trim()) fail(key);
    if (env.JWT_SECRET.length < 32 || /change|example|test|secret/i.test(env.JWT_SECRET)) fail('JWT_SECRET must be random');
    let origin, db;
    try { origin = new URL(env.CLIENT_ORIGIN); db = new URL(env.DB_URL); } catch { fail('URLs'); }
    if (origin.protocol !== 'https:' || origin.origin !== env.CLIENT_ORIGIN) fail('CLIENT_ORIGIN requires exact HTTPS origin');
    if (!['postgres:','postgresql:'].includes(db.protocol)) fail('DB_URL');
    if (['sslmode','sslcert','sslkey','sslrootcert'].some(k=>db.searchParams.has(k))) fail('DB_URL SSL query options override certificate validation; use DB_SSL and DB_CA_CERT');
    if (env.DB_SSL !== 'true' || env.DB_SSL_REJECT_UNAUTHORIZED !== 'true') fail('verified database TLS is required');
    if (env.FLIGHT_PROVIDER !== 'aviationstack' || env.EMAIL_ENABLED !== 'true' || env.TRACKER_ENABLED === 'false') fail('real tracking and email must be enabled');
    if (env.DEMO_ENABLED === 'true' || env.LOCAL_AUTOMATION_ENABLED === 'true') fail('local demo features must be disabled');
    if (!existsSync(env.PDF_FONT_PATH)) fail('PDF_FONT_PATH does not exist');
    if (env.TRUST_PROXY && !['0','1'].includes(env.TRUST_PROXY)) fail('TRUST_PROXY must be 0 or 1');
}
validateProduction();
