import { useState } from "react";
import type { FormEvent } from "react";
import { LogOut, Mail, ShieldCheck, UserRound } from "lucide-react";
import { useAuthStore } from "../store/authStore";
import { useNotificationStore } from "../store/useNotificationStore";
import { usersService } from "../services/users.service";
import { errorMessage } from "../services/api";
import { PageHeading } from "../components/common/PageHeading";
import { Input } from "../components/common/Input";
import { Button } from "../components/common/Button";
import { ErrorState } from "../components/common/States";
import { initials, localZone } from "../utils/format";

export default function ProfilePage() {
    const { user, setUser, logout } = useAuthStore();
    const [name, setName] = useState(user?.name || "");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    async function save(event: FormEvent) {
        event.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const result = await usersService.update(name.trim());
            setUser(result);
            useNotificationStore
                .getState()
                .add({ type: "success", title: "Your profile is up to date" });
        } catch (error) {
            setError(errorMessage(error));
        } finally {
            setLoading(false);
        }
    }
    return (
        <div className="animate-rise">
            <PageHeading
                eyebrow="האדם מאחורי המסע"
                title="החשבון שלך"
                description="כמה פרטים כדי לשמור על סביבת העבודה שלך אישית."
            />
            <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
                <section className="card p-6 sm:p-7">
                    <div className="mb-7 flex items-center gap-4 border-b border-line pb-6">
                        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-teal-50 text-lg font-semibold text-teal-700">
                            {initials(user?.name || "SF")}
                        </span>
                        <div>
                            <h2 className="font-semibold">{user?.name}</h2>
                            <p className="mt-1 text-xs text-muted">
                                {user?.role === "ADMIN"
                                    ? "סביבת מנהל"
                                    : "סביבת נוסע"}
                            </p>
                        </div>
                    </div>
                    <form
                        onSubmit={(event) => void save(event)}
                        className="space-y-5"
                    >
                        <Input
                            label="שם מלא"
                            value={name}
                            icon={<UserRound size={16} />}
                            onChange={(event) => setName(event.target.value)}
                            minLength={2}
                            maxLength={100}
                            autoComplete="name"
                            required
                        />
                        <Input
                            label="כתובת אימייל"
                            value={user?.email || ""}
                            icon={<Mail size={16} />}
                            readOnly
                            hint="זוהי כתובת האימייל שבה אתה משתמש כדי להתחבר."
                        />
                        {error && <ErrorState message={error} />}
                        <Button
                            loading={loading}
                            type="submit"
                            disabled={name.trim() === user?.name}
                        >
                            שמור שינויים
                        </Button>
                    </form>
                </section>
                <aside className="space-y-5">
                    <section className="card p-6">
                        <ShieldCheck size={22} className="mb-3 text-teal-600" />
                        <h2 className="text-sm font-semibold">
                            העדפות סביבת העבודה שלך
                        </h2>
                        <dl className="mt-5 space-y-5 text-xs">
                            <div>
                                <dt className="text-muted">הצג אזור זמן</dt>
                                <dd className="mt-1.5 font-medium">
                                    {localZone}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-muted">מטבע</dt>
                                <dd className="mt-1.5 font-medium">
                                    שקל חדש (ILS)
                                </dd>
                            </div>
                            <div>
                                <dt className="text-muted">מצב תשלום</dt>
                                <dd className="mt-1.5 font-medium">
                                    תשלומים מדומים · ללא העברות אמיתיות
                                </dd>
                            </div>
                        </dl>
                        <p className="mt-5 text-[11px] leading-relaxed text-muted">
                            אזור הזמן מוגדר לפי הגדרות המכשיר שלך. עדכוני תביעות
                            בזמן אמת מועברים בזמן שסביבת העבודה שלך פתוחה.
                        </p>
                    </section>
                    <section className="rounded-2xl border border-line p-6">
                        <h2 className="text-sm font-semibold">
                            הכל מוכן לעת עתה?
                        </h2>
                        <p className="mb-4 mt-2 text-xs leading-relaxed text-muted">
                            הטיסות שלך ימשיכו להיות במעקב על ידי השרת לאחר
                            שתתנתק.
                        </p>
                        <Button
                            variant="secondary"
                            onClick={logout}
                            icon={<LogOut size={14} />}
                        >
                            התנתק
                        </Button>
                    </section>
                </aside>
            </div>
        </div>
    );
}
