import { api, getData } from "./api";
import type { Claim } from "../types/claims.types";

export const claimsService = {
    async list() {
        const claims = await getData<Claim[]>("/claims");
        return claims;
    },
    async downloadPdf(claim: Claim): Promise<void> {
        const response = await api.get<Blob>(
            `/claims/${encodeURIComponent(claim.id)}/pdf`,
            { responseType: "blob" }
        );
        const url = URL.createObjectURL(response.data);
        const link = document.createElement("a");
        link.href = url;
        link.download = `SureFlight-claim-${claim.id}.pdf`;
        document.body.append(link);
        link.click();
        link.remove();
        // Keep the object URL alive long enough for the browser to begin downloading.
        window.setTimeout(() => URL.revokeObjectURL(url), 10000);
    },
};
