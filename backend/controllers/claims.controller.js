import { listClaimsService, getClaimByIdService, getClaimPdfService } from "../services/claims.services.js";

function publicClaim({ pdfBuffer: _pdf, ...claim }) {
    return claim;
}

export async function listClaimsController(req, res) {
    try {
        const claims = await listClaimsService(req.user.id);
        return res.json({ data: claims });
    } catch (error) {
        return res.status(error.statusCode || error.status || 500).json({
            error: { code: error.code || "CLAIMS_ERROR", message: error.message },
        });
    }
}

export async function getClaimByIdController(req, res) {
    try {
        const claim = await getClaimByIdService(req.user.id, req.params.id);
        return res.json({ data: claim });
    } catch (error) {
        return res.status(error.statusCode || error.status || 500).json({
            error: { code: error.code || "CLAIMS_ERROR", message: error.message },
        });
    }
}

export async function getClaimPdfController(req, res) {
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
        return res.status(error.statusCode || error.status || 500).json({
            error: { code: error.code || "CLAIMS_ERROR", message: error.message },
        });
    }
}

export function createClaimsController(service) {
    return {
        async list(req, res) {
            if (service) {
                const claims = await service.list(req.user.id);
                const publicClaims = claims.map(publicClaim);
                return res.json({ data: publicClaims });
            }
            return listClaimsController(req, res);
        },
        async get(req, res) {
            if (service) {
                const claim = await service.getById(req.user.id, req.params.id);
                const publicClaimData = publicClaim(claim);
                return res.json({ data: publicClaimData });
            }
            return getClaimByIdController(req, res);
        },
        async pdf(req, res) {
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
            return getClaimPdfController(req, res);
        },
    };
}
