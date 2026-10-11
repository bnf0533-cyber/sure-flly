import { createHash } from "node:crypto";

/** Replace this interface with a durable payment worker/outbox before introducing real money. */
export function createMockPaymentGateway() {
    return {
        async pay({ idempotencyKey, amountIls, userId }) {
            if (
                !idempotencyKey ||
                !userId ||
                !Number.isInteger(amountIls) ||
                amountIls <= 0
            ) {
                throw new TypeError("Invalid mock payout");
            }
            // A deterministic ID makes retry after a DB rollback harmless in this simulated gateway.
            const digest = createHash("sha256")
                .update(`${idempotencyKey}:${userId}:${amountIls}`)
                .digest("hex")
                .slice(0, 24);
            const receipt = {
                transactionId: `mock_${digest}`,
                status: "PAID",
            };
            return receipt;
        },
    };
}
