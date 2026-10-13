import { Router } from 'express';
import { createAuthLimiter } from '../middleware/security.middleware.js';
import { createEmailVerification } from '../services/emailVerification.service.js';
import { createMailSender } from '../services/mail.service.js';
export function createVerificationRouter(db) {
    const router = Router();
    router.use(createAuthLimiter(5));
    router.post('/request', async (req,res) => {
        const sender = createMailSender();
        try { await createEmailVerification({db,sender,origin:process.env.CLIENT_ORIGIN || 'http://localhost:5173'}).request(req.user.id); }
        finally { sender.close(); }
        res.json({data:{message:'Verification email accepted for sending.'}});
    });
    router.post('/confirm', async (req,res) => {
        await createEmailVerification({db}).confirm(req.body.token, req.user.id);
        res.json({data:{verified:true}});
    });
    return router;
}
