import { useState } from "react";
import { Link } from "react-router-dom";
import { api, errorMessage } from "../services/api";
import type { TrackedFlight } from "../types/flights.types";
import { PageHeading } from "../components/common/PageHeading";
import { Button } from "../components/common/Button";
import { useFlightStore } from "../store/useFlightStore";
import { useClaimStore } from "../store/useClaimStore";

type RequestLog = { request: string; status: number; body: unknown };
export default function DemoPage() {
    const [tracked, setTracked] = useState<TrackedFlight | null>(null);
    const [live, setLive] = useState<Record<string, unknown> | null>(null);
    const [logs, setLogs] = useState<RequestLog[]>([]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    async function request(method: "GET" | "POST" | "PATCH", url: string, data?: unknown) {
        const response = await api.request({ method, url, data });
        setLogs(previous => [{ request: method + " /api" + url, status: response.status, body: response.data }, ...previous].slice(0, 8));
        return response.data.data;
    }
    async function run(action: () => Promise<void>) {
        setBusy(true); setError("");
        try { await action(); }
        catch (failure) { setError(errorMessage(failure)); }
        finally { setBusy(false); }
    }
    async function createDemo() {
        setTracked(await request("POST", "/demo/flights"));
        await useFlightStore.getState().fetch();
    }
    async function delayDemo() {
        if (!tracked) return;
        setTracked(await request("PATCH", "/demo/flights/" + tracked.id + "/status", { status: "DELAYED", delayMinutes: 480 }));
        await request("GET", "/claims");
        await Promise.all([useFlightStore.getState().fetch(), useClaimStore.getState().fetch()]);
    }
    return <div dir="rtl" className="space-y-6 animate-rise">
        <PageHeading eyebrow="המערכת בפעולה" title="הדגמה חיה" description="כל לחיצה שולחת בקשה אמיתית לשרת. כאן אפשר לראות גם נתוני ספק אמיתיים וגם תרחיש פיצוי מבוקר." />
        <section className="card p-6 space-y-5">
            <p className="rounded-xl bg-teal-50 p-4 text-sm leading-7">במעקב אמיתי בטיסות אל על (LY) וארקיע (IZ), שיבוש יוצר מסמכי פנייה עם הוראות ונוסח למילוי בטופס החברה. כאשר שליחת המייל מופעלת בשרת, המסמכים נשלחים לכתובת הנוסע. במסך התביעות מוצג מצב השליחה. הכפתורים של טיסת ההדגמה למטה ממשיכים להפעיל תרחיש מדומה ולא שולחים מייל ללקוח.</p>
            <h2 className="text-lg font-semibold">איך מדגימים את התהליך?</h2>
            <p className="text-sm leading-7 text-muted">הדפדפן שולח בקשה לבאקנד, הבאקנד בודק את המשתמש ומבצע את הפעולה, ואז מחזיר תשובה שמוצגת כאן. נתוני ההדגמה נשמרים ב־PostgreSQL שב־Supabase, ולכן הם יופיעו גם במסכי הטיסות והתביעות.</p>
            <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                    ["1. יצירת טיסה — POST", "לחץ על יצירת טיסת הדגמה. השרת יוצר טיסה והזמנה בחשבון שלך, או מחזיר את טיסת ההדגמה שכבר יצרת. קוד 201 מציין שהבקשה הצליחה."],
                    ["2. עדכון איחור — PATCH", "לחץ על איחור 8 שעות. נשלחים לשרת הסטטוס DELAYED ו־480 דקות. הבקשה משנה את טיסת ההדגמה שלך בלבד."],
                    ["3. בדיקת פיצוי", "השרת בודק את האיחור והמרחק. במסלול ההדגמה TLV–LHR, שמרחקו כ־3,593 ק״מ, איחור של 480 דקות מוביל לפיצוי מדומה של 2,450 ₪ לפי כללי הפרויקט."],
                    ["4. תביעה ו־PDF — GET", "נוצרת תביעה עם מסמך PDF, ונשלחת הודעה בזמן אמת. פתח את התביעות והורד את המסמך. לחיצה חוזרת על PATCH לא יוצרת תביעה כפולה."],
                ].map(([title, description]) => <li key={title} className="rounded-xl bg-slate-50 p-4"><h3 className="font-semibold text-sm mb-2">{title}</h3><p className="text-sm leading-6 text-muted">{description}</p></li>)}
            </ol>
            <details className="rounded-xl border border-line p-4"><summary className="cursor-pointer font-semibold text-sm">מה ההבדל בין טיסה אמיתית לטיסת ההדגמה?</summary><div className="mt-3 space-y-2 text-sm leading-7 text-muted"><p>כפתור Aviationstack שולח בקשה אמיתית לספק ומציג טיסה פעילה שהספק מחזיר. הוא לא יוצר הזמנה ולא משנה את הטיסה אצל חברת התעופה.</p><p>טיסת ההדגמה היא נתון בדיקה מסומן, אבל ה־POST, ה־PATCH, השמירה במסד ויצירת ה־PDF אמיתיים. התשלום מדומה, ולא נשלחת תביעה לחברת תעופה.</p><p>במעקב הרגיל אחר טיסות שהוספת, הבאקנד בודק טיסות פעילות בהפעלה ובכל שעה מול Aviationstack. טיסות ההדגמה אינן נשלחות לספק.</p></div></details>
        </section>
        {error && <p role="alert" className="card border-red-200 p-4 text-red-700">{error}</p>}
        <div className="grid gap-6 lg:grid-cols-2">
            <section className="card space-y-4 p-6">
                <span className="text-xs font-semibold text-teal-700">נתונים אמיתיים • Aviationstack</span>
                <h2 className="text-xl font-semibold">טיסה שמתרחשת עכשיו</h2>
                <p className="text-sm text-muted">השרת מבקש טיסה פעילה מהספק. כל לחיצה צורכת בקשה אחת מהמכסה, עד פעם בדקה. התוצאה מוצגת כאן ללא יצירת הזמנה עבורך.</p>
                <Button disabled={busy} onClick={() => void run(async () => setLive(await request("GET", "/demo/live")))}>שלוף טיסה אמיתית</Button>
                {live && <div className="rounded-xl bg-teal-50 p-4 space-y-2">
                    <p className="text-xl font-semibold" dir="ltr">{String(live.flightNumber ?? "—")} · {String(live.departureAirport ?? "—")} → {String(live.arrivalAirport ?? "—")}</p>
                    <p>{String(live.airline ?? "—")}</p><p>סטטוס אצל הספק: {String(live.status)}</p>
                    <p className="text-xs">התקבל: {new Date(String(live.receivedAt)).toLocaleString("he-IL")}</p>
                </div>}
            </section>
            <section className="card space-y-4 p-6">
                <span className="text-xs font-semibold text-amber-700">טיסת הדגמה • תשלום מדומה</span>
                <h2 className="text-xl font-semibold">מטיסה לתביעה</h2>
                <p className="text-sm text-muted">צור טיסת הדגמה בחשבון שלך, ואז שלח איחור של 8 שעות. השרת שומר את העדכון במסד ומפיק תביעה ו־PDF. נתוני ההדגמה נשארים בחשבון ומסומנים כהדגמה.</p>
                <div className="flex flex-wrap gap-3">
                    <Button disabled={busy} onClick={() => void run(createDemo)}>1. צור או טען טיסת הדגמה</Button>
                    <Button disabled={busy || !tracked} onClick={() => void run(delayDemo)}>2. שלח PATCH — איחור 8 שעות</Button>
                </div>
                {tracked && <div className="rounded-xl bg-amber-50 p-4 space-y-2">
                    <p className="font-semibold">{tracked.flight.airline} · {tracked.flight.flightNumber}</p>
                    <p>סטטוס: {tracked.flight.status} · איחור: {tracked.flight.delayMinutes} דקות</p>
                    <Link className="text-teal-700 underline" to="/claims">פתח את התביעות והורד PDF</Link>
                </div>}
            </section>
        </div>
        <section className="card p-6 space-y-4">
            <h2 className="font-semibold">הבקשות והתשובות מהשרת</h2>
            <p className="text-sm text-muted">פתח שורה כדי לראות את תשובת השרת: 200 פירושו הצלחה, ו־201 הוא קוד ההצלחה של יצירת ההדגמה. השדות status ו־delayMinutes מציגים את מצב הטיסה; בתביעה תראה amountIls ואת התשלום המדומה.</p>
            {!logs.length && <p className="text-sm text-muted">לחץ על אחד הכפתורים כדי להתחיל.</p>}
            {logs.map((log,index) => <details key={index} className="rounded-xl border border-line p-4" open={index === 0}>
                <summary dir="ltr" className="cursor-pointer font-mono text-sm">{log.request} → {log.status}</summary>
                <pre dir="ltr" className="mt-3 max-h-72 overflow-auto text-left text-xs">{JSON.stringify(log.body, null, 2)}</pre>
            </details>)}
        </section>
    </div>;
}
