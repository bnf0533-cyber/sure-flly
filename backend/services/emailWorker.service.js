import { createMailSender } from "./mail.service.js";
import { buildAirlineMessage } from "./airlineGuides.service.js";
import { findClaimByIdDAL } from "../DAL/claim.DAL.js";
import { createUserDAL } from "../DAL/user.DAL.js";
import { createTrackedFlightDAL } from "../DAL/trackedFlight.DAL.js";

export function createEmailWorker({ db, sender, enabled = () => process.env.EMAIL_ENABLED === "true", logger = console }) {
    let running = false, timer;
    async function tick() {
        if (running || !enabled()) return;
        running = true;
        let mail = sender;
        try {
            // A crash after SMTP acceptance is ambiguous: do not blindly resend.
            await db.query("UPDATE claims SET email_status = 'UNKNOWN', email_error = 'Delivery uncertain after interruption; check sent mail before retrying' WHERE email_status = 'SENDING' AND email_updated_at < $1", [new Date(Date.now()-300000).toISOString()]);
            const pending = await db.query("SELECT id FROM claims WHERE status = 'READY' AND email_status IN ('PENDING','FAILED') AND email_attempts < 3 AND (email_next_attempt_at IS NULL OR email_next_attempt_at <= $1) ORDER BY created_at LIMIT 10", [new Date().toISOString()]);
            if (!pending.rows.length) return;
            mail ||= createMailSender();
            for (const item of pending.rows) {
                const locked = await db.query("UPDATE claims SET email_status = 'SENDING', email_attempts = email_attempts + 1, email_updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND email_status IN ('PENDING','FAILED') RETURNING email_to, email_attempts", [item.id]);
                if (!locked.rows.length) continue;
                let submitted = false;
                try {
                    const claim = await findClaimByIdDAL(item.id, db);
                    const passenger = await createUserDAL(db).findById(claim.userId);
                    const tracked = await createTrackedFlightDAL(db).findById(claim.trackedFlightId);
                    const message = buildAirlineMessage({ flight: claim.flight, passenger, pnr: tracked.pnr });
                    submitted = true;
                    const receipt = await mail.send({ to: locked.rows[0].email_to, ...message, pdf: Buffer.from(claim.pdfBuffer), id: claim.id });
                    await db.query("UPDATE claims SET email_status = 'SENT', email_sent_at = CURRENT_TIMESTAMP, email_updated_at = CURRENT_TIMESTAMP, email_error = NULL, email_message_id = $2 WHERE id = $1", [item.id, receipt.messageId]);
                } catch (error) {
                    const definiteFailure = !submitted || ['EAUTH','ECONNECTION','EDNS','EENVELOPE'].includes(error.code) || (Number(error.responseCode) >= 400);
                    const status = definiteFailure ? 'FAILED' : 'UNKNOWN';
                    await db.query("UPDATE claims SET email_status = $2, email_error = $3, email_next_attempt_at = $4, email_updated_at = CURRENT_TIMESTAMP WHERE id = $1",
                        [item.id, status, definiteFailure ? 'Mail could not be sent; check SMTP configuration and recipient' : 'Delivery uncertain; check sent mail before retrying', new Date(Date.now()+60000*locked.rows[0].email_attempts).toISOString()]);
                    logger.error("Claim email failed", { claimId: item.id, status });
                }
            }
        } finally { if (!sender) mail?.close(); running = false; }
    }
    return { tick, start() { if (timer) return; timer = setInterval(() => void tick().catch(() => logger.error("Email worker failed")),30000); timer.unref(); void tick().catch(() => logger.error("Email worker failed")); }, stop() { clearInterval(timer); timer = undefined; } };
}
