import { ShieldCheck } from "lucide-react";

export function Footer() {
    return (
        <footer className="mt-10 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-5 text-[10px] text-muted">
            <span>
                © {new Date().getFullYear()} SureFlight. נוצר עבור מסעות חלקים
                יותר.
            </span>
            <span className="inline-flex items-center gap-1.5">
                <ShieldCheck size={12} /> מידע והכנת מסמכים · פנייה לחברה נשלחת על ידך
            </span>
        </footer>
    );
}
