import { NavLink } from "react-router-dom";
import {
    ArrowUpRight,
    LayoutDashboard,
    Plane,
    FileCheck2,
    UserRound,
    LogOut,
    ShieldCheck,
} from "lucide-react";
import clsx from "clsx";
import { useAuthStore } from "../../store/authStore";

const navigation = [
    ...(import.meta.env.DEV ? [{ to: "/demo", label: "הדגמה חיה", icon: Plane }] : []),
    { to: "/", label: "סקירה כללית", icon: LayoutDashboard },
    { to: "/flights", label: "הטיסות שלי", icon: Plane },
    { to: "/claims", label: "תביעות", icon: FileCheck2 },
    { to: "/account", label: "חשבון", icon: UserRound },
];

export function Brand({ light = false }: { light?: boolean }) {
    return (
        <span
            className={clsx(
                "inline-flex items-center gap-2.5 text-[23px] font-semibold tracking-tight",
                light ? "text-white" : "text-ink"
            )}
        >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-500 text-white">
                <Plane size={21} strokeWidth={2.2} className="-rotate-12" />
            </span>
            SureFlight
            <span className="-ml-2 mb-4 text-lg text-teal-500">.</span>
        </span>
    );
}

export function Sidebar() {
    const user = useAuthStore((state) => state.user);
    const logout = useAuthStore((state) => state.logout);
    return (
        <>
            <aside className="fixed inset-y-0 left-0 z-30 hidden w-[232px] flex-col bg-ink px-5 py-8 md:flex xl:w-[250px] xl:px-6">
                <NavLink
                    to="/"
                    aria-label="SureFlight overview"
                    className="px-1"
                >
                    <Brand light />
                </NavLink>
                <p className="mb-4 mt-12 px-3 text-[10px] font-semibold uppercase tracking-[.2em] text-slate-400">
                    סביבת העבודה שלך
                </p>
                <nav aria-label="Main navigation" className="space-y-2">
                    {navigation.map(({ to, label, icon: Icon }) => (
                        <NavLink
                            key={to}
                            to={to}
                            end={to === "/"}
                            className={({ isActive }) =>
                                clsx(
                                    "flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition-colors",
                                    isActive
                                        ? "bg-[#25434e] text-white"
                                        : "text-slate-300 hover:bg-white/5 hover:text-white"
                                )
                            }
                        >
                            {({ isActive }) => (
                                <>
                                    <Icon
                                        size={18}
                                        className={
                                            isActive
                                                ? "text-[#7bdbbc]"
                                                : "text-slate-400"
                                        }
                                    />
                                    <span>{label}</span>
                                    {isActive && (
                                        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#7bdbbc]" />
                                    )}
                                </>
                            )}
                        </NavLink>
                    ))}
                </nav>
                <div className="mt-auto">
                    <div className="mb-6 rounded-2xl border border-white/10 bg-white/[.04] p-4">
                        <ShieldCheck
                            size={23}
                            className="mb-3 text-[#7bdbbc]"
                        />
                        <p className="text-sm font-medium text-white">
                            קצת יותר שקט נפשי.
                        </p>
                        <p className="mt-2 text-xs leading-relaxed text-slate-400">
                            אנחנו עוקבים אחרי הטיסה שלך, כדי שתוכל להתרכז
                            בנסיעה.
                        </p>
                        <NavLink
                            to="/flights/new"
                            className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#7bdbbc]"
                        >
                            מעקב אחרי טיסה <ArrowUpRight size={14} />
                        </NavLink>
                    </div>
                    <div className="border-t border-white/10 px-2 pt-5">
                        <p className="truncate text-xs font-semibold text-slate-200">
                            {user?.name}
                        </p>
                        <p className="mt-1 truncate text-[11px] text-slate-400">
                            {user?.email}
                        </p>
                        <button
                            onClick={logout}
                            className="mt-4 flex items-center gap-2 text-xs text-slate-400 transition-colors hover:text-white"
                        >
                            <LogOut size={14} /> התנתק
                        </button>
                    </div>
                </div>
            </aside>
            <nav
                aria-label="Mobile navigation"
                className="fixed inset-x-0 bottom-0 z-30 grid grid-flow-col auto-cols-fr border-t border-line bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
            >
                {navigation.map(({ to, label, icon: Icon }) => (
                    <NavLink
                        key={to}
                        to={to}
                        end={to === "/"}
                        className={({ isActive }) =>
                            clsx(
                                "flex flex-col items-center gap-1 px-1 py-3 text-[10px] font-medium",
                                isActive ? "text-teal-600" : "text-muted"
                            )
                        }
                    >
                        <Icon size={19} />
                        {label}
                    </NavLink>
                ))}
            </nav>
        </>
    );
}
