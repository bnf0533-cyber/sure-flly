import { randomBytes, createHash } from 'node:crypto';
import { AppError } from '../utils/error.js';
const digest = value => createHash('sha256').update(value).digest('hex');
export function createEmailVerification({ db, sender, origin }) {
    return {
        async request(userId) {
            const token = randomBytes(32).toString('hex');
            const result = await db.query('UPDATE users SET verification_hash=$2, verification_expires_at=$3, verification_requested_at=$4 WHERE id=$1 AND email_verified=false AND (verification_requested_at IS NULL OR verification_requested_at < $5) RETURNING email',
                [userId,digest(token),new Date(Date.now()+1800000).toISOString(),new Date().toISOString(),new Date(Date.now()-60000).toISOString()]);
            if (!result.rows.length) throw new AppError(429,'WAIT','Already verified or recently requested. Please wait one minute.');
            const url = origin + '/account#verify=' + token;
            await sender.send({to:result.rows[0].email,subject:'SureFlight — אימות כתובת המייל',text:'לאימות כתובת המייל עבור מעקב הטיסות שלך, פתח את הקישור ולחץ על אימות. הקישור תקף ל־30 דקות. אם לא ביקשת זאת, התעלם מההודעה.\n'+url,id:randomBytes(16).toString('hex')});
        },
        async confirm(token, userId) {
            if (!/^[a-f0-9]{64}$/.test(token || '')) throw new AppError(400,'INVALID_TOKEN','Invalid verification link.');
            const result = await db.query('UPDATE users SET email_verified=true, verification_hash=NULL, verification_expires_at=NULL WHERE id=$1 AND verification_hash=$2 AND verification_expires_at > $3 RETURNING id', [userId,digest(token),new Date().toISOString()]);
            if (!result.rows.length) throw new AppError(400,'INVALID_TOKEN','Verification link expired, already used, or belongs to another account.');
        }
    };
}
