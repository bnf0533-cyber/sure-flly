import { useState } from "react";
import type { FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import {
    ArrowRight,
    Check,
    LockKeyhole,
    Mail,
    Plane,
    ShieldCheck,
    UserRound,
} from "lucide-react";
import { Brand } from "../components/layout/Sidebar";
import { Input } from "../components/common/Input";
import { Button } from "../components/common/Button";
import { ErrorState } from "../components/common/States";
import { useAuthStore } from "../store/authStore";
import { authService } from "../services/auth.service";
import { errorMessage } from "../services/api";

export default function LoginPage() {
    const location = useLocation();
    const isRegister = location.pathname === "/register";
    const navigate = useNavigate();
    const { user, token, ready, setSession } = useAuthStore();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    if (ready && token && user) {
        return <Navigate to="/" replace />;
    }

    async function submit(event: FormEvent) {
        event.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const result = isRegister
                ? await authService.register({
                      name: name.trim(),
                      email: email.trim(),
                      password,
                  })
                : await authService.login({ email: email.trim(), password });
            setSession(result);
            const from: unknown = (location.state as { from?: unknown } | null)
                ?.from;
            navigate(
                typeof from === "string" &&
                    from.startsWith("/") &&
                    !from.startsWith("//") &&
                    !["/login", "/register"].includes(from)
                    ? from
                    : "/",
                { replace: true }
            );
        } catch (error) {
            setError(errorMessage(error));
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="grid min-h-screen bg-white lg:grid-cols-[.95fr_1.05fr]">
            <section className="relative hidden overflow-hidden bg-ink p-12 text-white lg:flex lg:flex-col xl:p-16">
                <Link to="/login" aria-label="SureFlight">
                    <Brand light />
                </Link>
                <div className="relative z-10 my-auto py-16">
                    <p className="mb-6 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[.18em] text-[#9bdfca]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#9bdfca]" />
                        דרך חלקה יותר קדימה
                    </p>
                    <h1 className="max-w-lg text-[48px] font-medium leading-[1.12] tracking-tight xl:text-[58px]">
                        הנסיעה מביאה הפתעות.
                        <br />
                        <span className="text-[#a3e2cf]">
                            אנחנו מביאים בהירות.
                        </span>
                    </h1>
                    <p className="mt-6 max-w-sm text-sm leading-7 text-slate-300">
                        מעקב אחר טיסות, הערכות פיצויים ומסמכי התביעה שלך. הכל
                        יחד, מההמראה ועד למה שבא אחר כך.
                    </p>
                    <div className="mt-10 space-y-4">
                        {[
                            "רשום את הטיסה ומספר ההזמנה שלך",
                            "המעקב מתחיל 24 שעות לפני ההמראה",
                            "שיבושים זכאים הופכים לחבילות תביעה",
                        ].map((text) => (
                            <p
                                key={text}
                                className="flex items-center gap-3 text-xs text-slate-200"
                            >
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#7bdbbc]/15 text-[#9bdfca]">
                                    <Check size={12} />
                                </span>
                                {text}
                            </p>
                        ))}
                    </div>
                </div>
                <div className="relative z-10 flex items-center gap-2 text-[11px] text-slate-400">
                    <ShieldCheck size={15} />
                    הטיסה שלך. הזכויות שלך. במקום אחד.
                </div>
                <div className="hero-orbit -bottom-52 -right-56 h-[600px] w-[600px]" />
                <div className="hero-orbit -bottom-36 -right-40 h-[470px] w-[470px]" />
                <Plane
                    className="absolute bottom-32 right-20 rotate-[-25deg] text-[#7bdbbc]/30"
                    size={56}
                    strokeWidth={1}
                />
            </section>
            <section className="flex flex-col px-6 py-8 sm:px-12 lg:px-16">
                <div className="mb-10 lg:hidden">
                    <Brand />
                </div>
                <div className="my-auto w-full max-w-[390px] self-center py-10 animate-rise">
                    <div className="mb-7 flex h-12 w-12 items-center justify-center rounded-2xl border border-teal-100 bg-teal-50 text-teal-600">
                        <Plane size={23} />
                    </div>
                    <p className="mb-3 text-[10px] font-bold uppercase tracking-[.2em] text-teal-600">
                        הנסיעה שלך, מכוסה
                    </p>
                    <h2 className="text-[32px] font-semibold tracking-tight">
                        {isRegister ? "בואו נעלה אותך לסיפון." : "ברוך שובך."}
                    </h2>
                    <p className="mb-8 mt-3 text-sm leading-relaxed text-muted">
                        {isRegister
                            ? "צור את החשבון שלך והוסף קצת שקט נפשי לנסיעה הבאה שלך."
                            : "היכנס כדי לראות את הטיסות, העדכונים והתביעות שלך."}
                    </p>
                    <form
                        onSubmit={(event) => void submit(event)}
                        className="space-y-5"
                    >
                        {error && <ErrorState message={error} />}
                        {isRegister && (
                            <Input
                                label="שם מלא"
                                autoComplete="name"
                                placeholder="השם המלא שלך"
                                icon={<UserRound size={16} />}
                                value={name}
                                onChange={(event) =>
                                    setName(event.target.value)
                                }
                                minLength={2}
                                maxLength={100}
                                required
                            />
                        )}
                        <Input
                            label="כתובת אימייל"
                            type="email"
                            autoComplete="email"
                            placeholder="you@example.com"
                            icon={<Mail size={16} />}
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            maxLength={254}
                            required
                        />
                        <Input
                            label="סיסמה"
                            type="password"
                            autoComplete={
                                isRegister ? "new-password" : "current-password"
                            }
                            placeholder={
                                isRegister
                                    ? "בחר סיסמה חזקה"
                                    : "הזן את הסיסמה שלך"
                            }
                            icon={<LockKeyhole size={16} />}
                            value={password}
                            onChange={(event) =>
                                setPassword(event.target.value)
                            }
                            minLength={isRegister ? 8 : 1}
                            maxLength={72}
                            hint={
                                isRegister
                                    ? "לפחות 8 תווים. השתמש בשילוב של אותיות, מספרים וסמלים."
                                    : undefined
                            }
                            required
                        />
                        <Button
                            type="submit"
                            loading={loading}
                            className="w-full py-3"
                            icon={<ArrowRight size={16} />}
                        >
                            {isRegister ? "צור חשבון" : "התחבר"}
                        </Button>
                    </form>
                    <p className="mt-6 text-center text-xs text-muted">
                        {isRegister ? "כבר יש לך חשבון?" : "חדש ב-SureFlight?"}{" "}
                        <Link
                            to={isRegister ? "/login" : "/register"}
                            onClick={() => setError(null)}
                            className="ml-1 font-semibold text-teal-700 hover:underline"
                        >
                            {isRegister ? "התחבר" : "צור חשבון"}
                        </Link>
                    </p>
                    {!isRegister && import.meta.env.DEV && (
                        <div className="mt-8 rounded-xl border border-dashed border-slate-200 p-4">
                            <div className="flex items-center justify-between gap-3">
                                <p className="text-xs font-medium">
                                    חוקר את ההדגמה?
                                </p>
                                <button
                                    onClick={() => {
                                        setEmail("demo@sureflight.local");
                                        setPassword("SureFlight123!");
                                        setError(null);
                                    }}
                                    className="text-xs font-semibold text-teal-700 hover:underline"
                                >
                                    השתמש בחשבון הדגמה
                                </button>
                            </div>
                            <p className="mt-2 text-[11px] leading-relaxed text-muted">
                                זמין כאשר נתוני ההדגמה של השרת מופעלים. כל
                                התשלומים מדומים.
                            </p>
                        </div>
                    )}
                </div>
                <p className="mt-8 text-center text-[10px] leading-relaxed text-muted">
                    SureFlight מרכזת עדכוני טיסות ומסמכי פנייה לחברת התעופה.
                    <br />
                    הערכות פועלות על פי כללים מוגדרים; אינן קביעות משפטיות.
                </p>
            </section>
        </main>
    );
}
