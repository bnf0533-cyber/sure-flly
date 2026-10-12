import { Link, useLocation } from "react-router-dom";
import { ChevronRight, Plus } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { initials } from "../../utils/format";
import { Brand } from "./Sidebar";

export function NavBar({ connected }: { connected: boolean }) {
    const user = useAuthStore((state) => state.user);
    const { pathname } = useLocation();
    const current =
        pathname === "/"
            ? "סקירה כללית"
            : pathname === "/flights/new"
              ? "מעקב אחרי טיסה"
              : pathname.startsWith("/flights")
                ? "הטיסות שלי"
                : pathname === "/claims"
                  ? "תביעות"
                  : pathname === "/demo" ? "הדגמה חיה" : "חשבון";
    return (
        <header className="flex h-[82px] items-center justify-between gap-4 border-b border-line bg-white px-5 sm:px-8 lg:px-10">
            <div className="hidden items-center gap-2.5 text-xs md:flex">
                <span className="text-muted">סביבת עבודה</span>
                <ChevronRight size={12} className="text-slate-300" />
                <span className="font-medium text-ink">{current}</span>
            </div>
            <Link to="/" className="md:hidden" aria-label="SureFlight overview">
                <Brand />
            </Link>
            <div className="flex items-center gap-5">
                <span
                    className="hidden items-center gap-2 text-[11px] text-muted lg:flex"
                    title={
                        connected
                            ? "מחובר לעדכוני תביעות בזמן אמת"
                            : "השתמש ברענון כדי לבדוק עדכונים"
                    }
                >
                    <span
                        className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-teal-500" : "bg-amber-500"}`}
                    />
                    {connected
                        ? "עדכונים חיים מחוברים"
                        : "עדכונים חיים לא מקוונים"}
                </span>
                <Link
                    to="/flights/new"
                    className="hidden items-center gap-1.5 text-xs font-semibold text-teal-700 sm:flex"
                >
                    <Plus size={16} />
                    מעקב אחרי טיסה
                </Link>
                <span className="hidden h-6 w-px bg-line sm:block" />
                <Link
                    to="/account"
                    aria-label="Your account"
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-teal-100 bg-teal-50 text-xs font-semibold text-teal-700"
                >
                    {initials(user?.name || "SF")}
                </Link>
            </div>
        </header>
    );
}
