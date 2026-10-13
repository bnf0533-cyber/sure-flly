import { listClaimsService, getClaimByIdService, getClaimPdfService, autofillElAlClaimService } from "../services/claims.services.js";

function publicClaim({ pdfBuffer: _pdf, ...claim }) {
    return claim;
}

export async function autofillElAlClaimController(req, res, next) {
    try {
        const result = await autofillElAlClaimService(req.user.id, req.params.id);
        return res.json({ data: result });
    } catch (error) {
        return next(error);
    }
}

export async function listClaimsController(req, res, next) {
    try {
        const claims = await listClaimsService(req.user.id);
        return res.json({ data: claims });
    } catch (error) {
        return next(error);
    }
}

export async function getClaimByIdController(req, res, next) {
    try {
        const claim = await getClaimByIdService(req.user.id, req.params.id);
        return res.json({ data: claim });
    } catch (error) {
        return next(error);
    }
}

export async function getClaimPdfController(req, res, next) {
    try {
        const result = await getClaimPdfService(req.user.id, req.params.id);
        const buffer = Buffer.isBuffer(result) ? result : result.buffer;
        res.set({
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="sureflight-claim-${req.params.id}.pdf"`,
            "Cache-Control": "private, no-store",
        });
        return res.send(buffer);
    } catch (error) {
        return next(error);
    }
}

export function createClaimsController(service) {
    return {
        async list(req, res, next) {
            if (service) {
                const claims = await service.list(req.user.id);
                const publicClaims = claims.map(publicClaim);
                return res.json({ data: publicClaims });
            }
            return listClaimsController(req, res, next);
        },
        async get(req, res, next) {
            if (service) {
                const claim = await service.getById(req.user.id, req.params.id);
                const publicClaimData = publicClaim(claim);
                return res.json({ data: publicClaimData });
            }
            return getClaimByIdController(req, res, next);
        },
        async pdf(req, res, next) {
            if (service) {
                const result = await service.getPdf(req.user.id, req.params.id);
                const buffer = Buffer.isBuffer(result) ? result : result.buffer;
                res.set({
                    "Content-Type": "application/pdf",
                    "Content-Disposition": `attachment; filename="sureflight-claim-${req.params.id}.pdf"`,
                    "Cache-Control": "private, no-store",
                });
                return res.send(buffer);
            }
            return getClaimPdfController(req, res, next);
        },
        async autofillElAl(req, res, next) {
            if (service && service.autofillElAl) {
                const result = await service.autofillElAl(req.user.id, req.params.id);
                return res.json({ data: result });
            }
            return autofillElAlClaimController(req, res, next);
        },
    };
}
