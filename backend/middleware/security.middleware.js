import rateLimit from 'express-rate-limit';
export const productionOnlyOff = (_req,res,next) => process.env.NODE_ENV === 'production'
    ? res.status(404).json({error:{code:'NOT_FOUND',message:'This feature is not available.'}}) : next();
export function createAuthLimiter(limit = 10) {
    return rateLimit({ windowMs: 15 * 60000, limit, standardHeaders: 'draft-8', legacyHeaders: false,
        message: { error: { code:'RATE_LIMITED', message:'Too many attempts. Please wait before trying again.' } } });
}
export function requireVerifiedEmail(req,res,next) {
    if (process.env.NODE_ENV === 'production' && !req.user.emailVerified)
        return res.status(403).json({error:{code:'EMAIL_NOT_VERIFIED',message:'Verify your email in your account before tracking flights.'}});
    next();
}
