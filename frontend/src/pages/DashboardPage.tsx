import { Link } from "react-router-dom";
import {
    ArrowRight,
    ArrowUpRight,
    BellRing,
    CheckCircle2,
    FileCheck2,
    Plane,
    Plus,
    Radar,
    RefreshCw,
    ShieldCheck,
    Wallet,
} from "lucide-react";
import { useAuthStore } from "../store/authStore";
import { useFlightStore } from "../store/useFlightStore";
import { useClaimStore } from "../store/useClaimStore";
import { PageHeading } from "../components/common/PageHeading";
import { Button } from "../components/common/Button";
import { Loader } from "../components/common/Loader";
import { EmptyState, ErrorState } from "../components/common/States";
import { FlightCard } from "../components/flights/FlightCard";
import { ClaimRow } from "../components/claims/ClaimRow";
import { currency, localZone } from "../utils/format";

export default function DashboardPage() {
    const user = useAuthStore((state) => state.user);
    const flights = useFlightStore();
    const claims = useClaimStore();
    const activeFlights = flights.flights.filter(
        ({ flight }) => flight.trackingStatus !== "COMPLETED"
    );
    const upcoming = [...activeFlights]
        .sort(
            (a, b) =>
                Date.parse(a.flight.scheduledDeparture) -
                Date.parse(b.flight.scheduledDeparture)
        )
        .slice(0, 2);
    const paidClaims = claims.claims.filter((claim) => claim.status === "PAID");
    const totalPaid = paidClaims.reduce(
        (sum, claim) => sum + Number(claim.amountIls),
        0
    );
    const hour = new Date().getHours();
    const greeting =
        hour < 12 ? "בוקר טוב" : hour < 18 ? "צהריים טובים" : "ערב טוב";
    const stats = [
        {
            label: "הטיסות שאחריהן אתה עוקב",
            value: flights.loaded ? String(flights.flights.length) : "—",
            description: `${activeFlights.length} נסיעות תחת מעקב`,
            icon: Plane,
            color: "bg-blue-50 text-blue-600",
        },
        {
            label: "מעקב בזמן אמת",
            value: flights.loaded
                ? String(
                      flights.flights.filter(
                          ({ flight }) =>
                              flight.trackingStatus === "ACTIVE_TRACKING"
                      ).length
                  )
                : "—",
            description: "בתוך 24 שעות מההמראה",
            icon: Radar,
            color: "bg-teal-50 text-teal-600",
        },
        {
            label: "תביעות אוטומטיות",
            value: claims.loaded ? String(claims.claims.length) : "—",
            description: `${paidClaims.length} תשלומים מדומים הושלמו`,
            icon: FileCheck2,
            color: "bg-violet-50 text-violet-600",
        },
        {
            label: 'סה"כ תשלומים מדומים',
            value: claims.loaded ? currency(totalPaid) : "—",
            description: "תשלומים מדומים בלבד",
            icon: Wallet,
            color: "bg-amber-50 text-amber-700",
        },
    ];
    return (
        <div className="animate-rise">
            <PageHeading
                eyebrow="הנסיעה שלך, במבט חטוף"
                title={`${greeting}, ${user?.name.split(" ")[0] || "נוסע"}.`}
                description="מבט ברור על הטיסות שלך ומה שבא אחר כך."
                action={
                    <Link to="/flights/new" className="btn btn-primary">
                        <Plus size={15} />
                        מעקב אחרי טיסה
                    </Link>
                }
            />
            {(flights.error || claims.error) && (
                <div className="mb-5">
                    <ErrorState
                        message={flights.error || claims.error || ""}
                        onRetry={() => {
                            void flights.fetch();
                            void claims.fetch();
                        }}
                    />
                </div>
            )}
            <section className="relative mb-7 flex min-h-[183px] items-center overflow-hidden rounded-2xl bg-ink px-7 py-7 text-white sm:px-8">
                <div className="relative z-10 max-w-[65%] sm:max-w-[70%]">
                    <p className="mb-3 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[.15em] text-[#9bdfca]">
                        <ShieldCheck size={13} />
                        קצת יותר שקט נפשי
                    </p>
                    <h2 className="text-xl font-medium tracking-tight sm:text-[26px]">
                        אתה מתכנן את הנסיעה.
                        <br className="sm:hidden" /> אנחנו עוקבים אחרי הטיסה.
                    </h2>
                    <p className="mt-2.5 max-w-md text-xs leading-6 text-slate-300">
                        מעדכוני טיסה ועד מסמכי תביעה, הצעד הבא שלך תמיד ברור.
                    </p>
                    <Link
                        to="/flights"
                        className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-[#9bdfca]"
                    >
                        צפה בנסיעות שלך
                        <ArrowRight size={14} />
                    </Link>
                </div>
                <div className="hero-orbit -right-10 top-[-66px] h-[310px] w-[310px]" />
                <div className="hero-orbit right-2 top-[-20px] h-[218px] w-[218px]" />
                <div className="hero-orbit right-14 top-[26px] h-[126px] w-[126px]" />
                <div className="absolute right-12 top-1/2 flex h-20 w-20 -translate-y-1/2 items-center justify-center rounded-full border border-[#74c6ad]/30 bg-[#244a50] sm:right-20">
                    <Plane
                        size={37}
                        strokeWidth={1.4}
                        className="-rotate-12 text-[#b6eadb]"
                    />
                </div>
                <span className="absolute right-[225px] top-8 h-2 w-2 rounded-full bg-[#9bdfca]" />
            </section>
            <section
                aria-label="Your flight statistics"
                className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
            >
                {stats.map(
                    ({ label, value, description, icon: Icon, color }) => (
                        <div className="card px-5 py-5" key={label}>
                            <div className="mb-4 flex items-center justify-between gap-2">
                                <p className="text-[11px] font-medium text-muted">
                                    {label}
                                </p>
                                <span
                                    className={`flex h-8 w-8 items-center justify-center rounded-lg ${color}`}
                                >
                                    <Icon size={16} />
                                </span>
                            </div>
                            <p className="text-[29px] font-semibold leading-none tracking-tight">
                                {value}
                            </p>
                            <p className="mt-3 text-[10px] text-muted">
                                {description}
                            </p>
                        </div>
                    )
                )}
            </section>
            <div className="grid gap-7 2xl:grid-cols-[1.9fr_1fr]">
                <div className="min-w-0 space-y-7">
                    <section>
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                                <h2 className="section-title">הנסיעות שלך</h2>
                                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-muted">
                                    {activeFlights.length}
                                </span>
                            </div>
                            <Link
                                to="/flights"
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700"
                            >
                                צפה בכל הטיסות
                                <ArrowUpRight size={13} />
                            </Link>
                        </div>
                        {!flights.loaded ? (
                            <div className="card">
                                <Loader />
                            </div>
                        ) : upcoming.length ? (
                            <div className="grid gap-4 lg:grid-cols-2">
                                {upcoming.map((flight) => (
                                    <FlightCard
                                        key={flight.id}
                                        trackedFlight={flight}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="card">
                                <EmptyState
                                    icon={<Plane size={25} />}
                                    title="הנסיעה הבאה שלך מתחילה כאן"
                                    description="הוסף את הטיסה ומספר ההזמנה שלך. נתחיל לעקוב 24 שעות לפני ההמראה."
                                    action={
                                        <Link
                                            to="/flights/new"
                                            className="btn btn-primary"
                                        >
                                            <Plus size={14} />
                                            עקוב אחר הטיסה הראשונה שלך
                                        </Link>
                                    }
                                />
                            </div>
                        )}
                        <p className="mt-3 text-[10px] text-muted">
                            כל זמני הטיסות מוצגים באזור הזמן {localZone}.
                        </p>
                    </section>
                    <section>
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="section-title">תביעות אחרונות</h2>
                            <Link
                                to="/claims"
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700"
                            >
                                צפה בכל התביעות
                                <ArrowUpRight size={13} />
                            </Link>
                        </div>
                        <div className="card overflow-hidden">
                            {!claims.loaded ? (
                                <Loader label="טוען תביעות…" />
                            ) : claims.claims.length ? (
                                [...claims.claims]
                                    .sort(
                                        (a, b) =>
                                            Date.parse(b.createdAt) -
                                            Date.parse(a.createdAt)
                                    )
                                    .slice(0, 3)
                                    .map((claim) => (
                                        <ClaimRow
                                            key={claim.id}
                                            claim={claim}
                                        />
                                    ))
                            ) : (
                                <EmptyState
                                    icon={<FileCheck2 size={24} />}
                                    title="אין תביעות עדיין. שמיים בהירים לפנינו."
                                    description="כאשר בטיסה במעקב יש שיבוש זכאי, חבילת התביעה שלך תופיע כאן אוטומטית."
                                />
                            )}
                        </div>
                    </section>
                </div>
                <aside className="grid content-start gap-5 lg:grid-cols-2 2xl:grid-cols-1">
                    <section className="card p-6">
                        <div className="mb-5 flex items-center justify-between">
                            <h2 className="section-title">
                                מההמראה ועד לפתרון
                            </h2>
                            <ShieldCheck size={18} className="text-teal-600" />
                        </div>
                        <div className="space-y-5">
                            {[
                                {
                                    icon: Plane,
                                    title: "הוסף את זה פעם אחת",
                                    text: "הטיסה שלך ומספר ההזמנה בן 6 תווים נמצאים כולם במקום אחד.",
                                },
                                {
                                    icon: BellRing,
                                    title: "אנחנו שומרים",
                                    text: "מעקב חי מתחיל בתוך 24 שעות מההמראה המתוכננת שלך.",
                                },
                                {
                                    icon: CheckCircle2,
                                    title: "הצעד הבא שלך, מוכן",
                                    text: "שיבושים זכאים מפעילים תביעת PDF ותשלום מדומה.",
                                },
                            ].map(({ icon: Icon, title, text }, index) => (
                                <div key={title} className="flex gap-3">
                                    <div className="relative">
                                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-50 text-teal-600">
                                            <Icon size={14} />
                                        </span>
                                        {index < 2 && (
                                            <span className="absolute left-4 top-9 h-9 border-l border-dashed border-teal-100" />
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="text-xs font-semibold">
                                            {title}
                                        </h3>
                                        <p className="mt-1.5 text-[11px] leading-relaxed text-muted">
                                            {text}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                    <section className="rounded-2xl border border-teal-100 bg-[#edf6f2] p-6">
                        <p className="mb-2 text-[10px] font-bold uppercase tracking-[.14em] text-teal-700">
                            דע את ההערכה שלך
                        </p>
                        <h2 className="text-lg font-semibold tracking-tight">
                            המרחק עושה את ההבדל.
                        </h2>
                        <p className="mt-2 text-[11px] leading-relaxed text-muted">
                            פיצוי מוגדר עבור ביטולים או עיכובים של 8 שעות או
                            יותר.
                        </p>
                        <dl className="mt-4 space-y-3 text-xs">
                            {[
                                ['עד 2,000 ק"מ', 1530],
                                ['מעל 2,000 עד 4,500 ק"מ', 2450],
                                ['מעל 4,500 ק"מ', 3670],
                            ].map(([distance, amount]) => (
                                <div
                                    key={distance}
                                    className="flex items-center justify-between gap-3 border-b border-teal-100 pb-3 last:border-0 last:pb-0"
                                >
                                    <dt className="text-muted">{distance}</dt>
                                    <dd className="font-semibold text-teal-700">
                                        {currency(Number(amount))}
                                    </dd>
                                </div>
                            ))}
                        </dl>
                        <p className="mt-4 border-t border-teal-100 pt-3 text-[10px] leading-relaxed text-muted">
                            כללי הדגמה, לא קביעת זכאות משפטית. הזכויות האמיתיות
                            תלויות בחוק החל ובנסיבות.
                        </p>
                    </section>
                </aside>
            </div>
            <div className="mt-6 flex justify-end">
                <Button
                    variant="ghost"
                    loading={flights.loading || claims.loading}
                    icon={<RefreshCw size={13} />}
                    onClick={() => {
                        void flights.fetch();
                        void claims.fetch();
                    }}
                    className="text-[11px]"
                >
                    רענן סביבת עבודה
                </Button>
            </div>
        </div>
    );
}
