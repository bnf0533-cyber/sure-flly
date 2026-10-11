import { useState } from "react";
import {
    FileCheck2,
    RefreshCw,
    Search,
    ShieldCheck,
    Wallet,
} from "lucide-react";
import clsx from "clsx";
import { PageHeading } from "../components/common/PageHeading";
import { Button } from "../components/common/Button";
import { Loader } from "../components/common/Loader";
import { EmptyState, ErrorState } from "../components/common/States";
import { ClaimRow } from "../components/claims/ClaimRow";
import { useClaimStore } from "../store/useClaimStore";
import { currency } from "../utils/format";

export default function ClaimsListPage() {
    const { claims, loading, loaded, error, fetch } = useClaimStore();
    const [filter, setFilter] = useState<"ALL" | "PAID" | "PROCESSING">("ALL");
    const [search, setSearch] = useState("");
    const paid = claims.filter((claim) => claim.status === "PAID");
    const visible = claims
        .filter(
            (claim) =>
                (filter === "ALL" || filter === claim.status) &&
                `${claim.flight.flightNumber} ${claim.flight.departureAirport} ${claim.flight.arrivalAirport}`
                    .toLowerCase()
                    .includes(search.trim().toLowerCase())
        )
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

    return (
        <div className="animate-rise">
            <PageHeading
                eyebrow="משיבוש לפתרון"
                title="התביעות שלך"
                description="חבילות התביעה שלך, עדכוני סטטוס ותשלומים מדומים."
                action={
                    <Button
                        variant="secondary"
                        loading={loading}
                        onClick={() => void fetch()}
                        icon={<RefreshCw size={14} />}
                    >
                        רענן תביעות
                    </Button>
                }
            />
            <div className="mb-7 grid gap-4 sm:grid-cols-3">
                {[
                    {
                        title: "חבילות תביעה",
                        value: loaded ? String(claims.length) : "—",
                        icon: FileCheck2,
                    },
                    {
                        title: "תשלומים מדומים הושלמו",
                        value: loaded ? String(paid.length) : "—",
                        icon: ShieldCheck,
                    },
                    {
                        title: "סה״כ סכום מדומה",
                        value: loaded
                            ? currency(
                                  paid.reduce(
                                      (sum, claim) =>
                                          sum + Number(claim.amountIls),
                                      0
                                  )
                              )
                            : "—",
                        icon: Wallet,
                    },
                ].map(({ title, value, icon: Icon }) => (
                    <div
                        key={title}
                        className="card flex items-center gap-4 p-5"
                    >
                        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
                            <Icon size={20} />
                        </span>
                        <div>
                            <p className="text-[11px] text-muted">{title}</p>
                            <p className="mt-1.5 text-2xl font-semibold tracking-tight">
                                {value}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
            {error && (
                <div className="mb-5">
                    <ErrorState message={error} onRetry={() => void fetch()} />
                </div>
            )}
            <section className="card overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line p-5">
                    <div className="flex gap-1" aria-label="Filter claims">
                        {(
                            [
                                { value: "ALL", label: "כל התביעות" },
                                { value: "PAID", label: "שולם (מדומה)" },
                                { value: "PROCESSING", label: "בטיפול" },
                            ] as const
                        ).map(({ value, label }) => (
                            <button
                                key={value}
                                aria-pressed={filter === value}
                                className={clsx(
                                    "rounded-lg px-3 py-2 text-xs font-medium",
                                    filter === value
                                        ? "bg-teal-50 text-teal-700"
                                        : "text-muted hover:bg-slate-50"
                                )}
                                onClick={() => setFilter(value)}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                    <div className="relative w-full sm:w-auto">
                        <Search
                            size={15}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                        />
                        <input
                            type="search"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            className="input min-h-10 pl-9 text-xs"
                            aria-label="Search claims"
                            placeholder="חפש טיסה או נתיב…"
                        />
                    </div>
                </div>
                {!loaded ? (
                    <Loader label="טוען תביעות…" />
                ) : visible.length ? (
                    visible.map((claim) => (
                        <ClaimRow key={claim.id} claim={claim} detailed />
                    ))
                ) : (
                    <EmptyState
                        icon={<FileCheck2 size={26} />}
                        title={
                            claims.length
                                ? "אין תביעות התואמות לחיפוש"
                                : "השלב הבא שלך כבר מתוכנן"
                        }
                        description={
                            claims.length
                                ? "נסה מסנן או חיפוש אחר."
                                : "ביטול או עיכוב של 8 שעות ומעלה בטיסה במעקב יוצרים תביעה באופן אוטומטי. תוכל להוריד את קובץ ה-PDF שלך כאן כשהוא יהיה מוכן."
                        }
                        action={
                            claims.length ? (
                                <Button
                                    variant="secondary"
                                    onClick={() => {
                                        setFilter("ALL");
                                        setSearch("");
                                    }}
                                >
                                    נקה מסננים
                                </Button>
                            ) : undefined
                        }
                    />
                )}
            </section>
            <p className="mt-5 flex items-start gap-2 text-[11px] leading-relaxed text-muted">
                <ShieldCheck size={15} className="shrink-0" />
                כל התשלומים מדומים. קבצי PDF הם טיוטות של חבילות תביעה המבוססות
                על הכללים המוגדרים; לא נשלחות תביעות לחברות התעופה ולא מועבר כסף
                אמיתי.
            </p>
        </div>
    );
}
