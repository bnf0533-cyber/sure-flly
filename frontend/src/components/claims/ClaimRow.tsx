import { useState } from "react";
import { ArrowRight, Bot, Download, FileCheck2 } from "lucide-react";
import type { Claim } from "../../types/claims.types";
import { currency, shortDate } from "../../utils/format";
import { claimsService } from "../../services/claims.service";
import { errorMessage } from "../../services/api";
import { useNotificationStore } from "../../store/useNotificationStore";
import { StatusBadge } from "../common/StatusBadge";
import { Button } from "../common/Button";

export function ClaimRow({
    claim,
    detailed = false,
}: {
    claim: Claim;
    detailed?: boolean;
}) {
    const [downloading, setDownloading] = useState(false);
    const [autofilling, setAutofilling] = useState(false);

    const isElAl =
        claim.flight.flightNumber.toUpperCase().startsWith("LY") ||
        (claim.flight.airline && (
            claim.flight.airline.includes("אל על") ||
            claim.flight.airline.toLowerCase().includes("el al")
        ));

    async function autofillElAl() {
        setAutofilling(true);
        try {
            const res = await claimsService.autofillElAl(claim.id);
            useNotificationStore
                .getState()
                .add({
                    type: res.success ? "success" : "info",
                    title: "מילוי אוטומטי באל-על",
                    message: res.message,
                });
        } catch (error) {
            useNotificationStore
                .getState()
                .add({
                    type: "error",
                    title: "שגיאה בהפעלת מילוי אל-על",
                    message: errorMessage(error),
                });
        } finally {
            setAutofilling(false);
        }
    }

    async function download() {
        setDownloading(true);
        try {
            await claimsService.downloadPdf(claim);
        } catch (error) {
            useNotificationStore
                .getState()
                .add({
                    type: "error",
                    title: "PDF download failed",
                    message: errorMessage(error),
                });
        } finally {
            setDownloading(false);
        }
    }
    return (
        <article className="flex flex-wrap items-center gap-4 border-b border-line px-5 py-5 last:border-b-0 sm:px-6">
            <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-600 sm:flex">
                <FileCheck2 size={19} />
            </span>
            <div className="min-w-36 flex-1">
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                    {claim.flight.departureAirport}
                    <ArrowRight size={12} className="text-muted" />
                    {claim.flight.arrivalAirport}
                    <span className="ml-1 text-[11px] font-normal text-muted">
                        {claim.flight.flightNumber}
                    </span>
                </h3>
                <p className="mt-1.5 text-[11px] text-muted">
                    {shortDate(claim.createdAt)}
                    {detailed && ` · ${claim.flight.airline}`}
                </p>
                {detailed && claim.mockTransactionId && (
                    <p className="mt-2 break-all font-mono text-[10px] text-muted">
                        עסקה מדומה: {claim.mockTransactionId}
                    </p>
                )}
            </div>
            <div className="text-right">
                <p className="mb-1.5 text-base font-semibold">
                    {claim.status === "READY" ? "פנייה לחברת התעופה" : currency(claim.amountIls)}
                </p>
                <StatusBadge status={claim.status} />
                {claim.status === "READY" && <p className="mt-2 text-xs text-muted">{{ NOT_QUEUED: "טרם הוכנס לתור", PENDING: "ממתין לשליחת מייל", SENDING: "שולח מייל", SENT: "נמסר לשרת הדואר", FAILED: "השליחה נכשלה", UNKNOWN: "יש לבדוק את השליחה לפני ניסיון חוזר" }[claim.emailStatus]}{claim.emailSentAt ? " · " + new Date(claim.emailSentAt).toLocaleString("he-IL") : ""}</p>}
            </div>
            <div className="mr-auto flex items-center gap-2 sm:mr-2">
                {isElAl && (
                    <Button
                        variant="primary"
                        loading={autofilling}
                        onClick={() => void autofillElAl()}
                        icon={<Bot size={14} />}
                        title="פתח דפדפן ומלא אוטומטית את פרטי הפנייה באתר אל על"
                        className="px-3 text-[11px] bg-blue-600 hover:bg-blue-700 text-white"
                    >
                        מילוי באל-על
                    </Button>
                )}
                <Button
                    variant="secondary"
                    loading={downloading}
                    onClick={() => void download()}
                    icon={<Download size={14} />}
                    aria-label={`הורד קובץ תביעה ב-PDF עבור ${claim.flight.flightNumber}`}
                    className="px-3 text-[11px]"
                >
                    PDF
                </Button>
            </div>
        </article>
    );
}
