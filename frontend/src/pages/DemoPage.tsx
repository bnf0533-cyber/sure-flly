import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpLeft, Check, Download, FileText, Mail, Plane, Play, Radar, Sparkles, ExternalLink } from "lucide-react";
import { api, errorMessage } from "../services/api";
import { claimsService } from "../services/claims.service";
import type { Claim } from "../types/claims.types";
import type { TrackedFlight } from "../types/flights.types";
import { Button } from "../components/common/Button";
import { useFlightStore } from "../store/useFlightStore";
import { useClaimStore } from "../store/useClaimStore";
import "./DemoPage.css";

type RequestLog = { request: string; status: number; body: unknown };
const steps = [
    { title: "מוסיפים טיסה", text: "פרטי הטיסה וההזמנה נשמרים בחשבון שלך.", icon: Plane },
    { title: "מזהים שיבוש", text: "במעקב אמיתי הספק מעדכן. כאן מפעילים איחור מבוקר.", icon: Radar },
    { title: "מכינים מסמכים", text: "המערכת יוצרת תיק ו־PDF שאפשר להוריד מיד.", icon: FileText },
];
export default function DemoPage() {
    const [tracked, setTracked] = useState<TrackedFlight | null>(null);
    const [claim, setClaim] = useState<Claim | null>(null);
    const [live, setLive] = useState<Record<string, unknown> | null>(null);
    const [logs, setLogs] = useState<RequestLog[]>([]);
    const [busy, setBusy] = useState("");
    const [stage, setStage] = useState(0);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [elapsed, setElapsed] = useState<number | null>(null);
    async function request<T>(method: "GET" | "POST" | "PATCH", url: string, data?: unknown): Promise<T> {
        const response = await api.request({ method, url, data });
        setLogs(previous => [{ request: method + " /api" + url, status: response.status, body: response.data }, ...previous].slice(0, 8));
        return response.data.data;
    }
    async function run(label: string, action: () => Promise<void>) {
        if (busy) return;
        setBusy(label); setError(""); setNotice("");
        try { await action(); }
        catch (failure) { setError(errorMessage(failure)); }
        finally { setBusy(""); }
    }
    async function demonstrate() {
        setStage(0); setClaim(null); setElapsed(null); setTracked(null);
        const start = performance.now();
        const booking = await request<TrackedFlight>("POST", "/demo/flights");
        setTracked(booking); setStage(1);
        const updated = await request<TrackedFlight>("PATCH", `/demo/flights/${booking.id}/status`, { status: "DELAYED", delayMinutes: 480 });
        setTracked(updated); setStage(2);
        const claims = await request<Claim[]>("GET", "/claims");
        const result = claims.find(item => item.trackedFlightId === booking.id);
        if (!result) throw new Error("העדכון נשמר, אך המסמך עדיין אינו זמין. אפשר לנסות שוב.");
        setClaim(result); setStage(3); setElapsed((performance.now() - start) / 1000);
        useClaimStore.getState().setClaims(claims);
        await useFlightStore.getState().fetch();
    }
    return <div dir="rtl" className="sf-demo space-y-7">
        <section className="demo-hero">
            <div className="demo-orbit" aria-hidden="true" />
            <div className="relative z-10 max-w-2xl">
                <span className="demo-kicker"><Sparkles size={14} /> SUREFLIGHT · מהעיכוב לצעד הבא</span>
                <h1>הטיסה התעכבה.<br /><span>הטיפול לא חייב להתעכב.</span></h1>
                <p className="demo-lead">פחות חיפוש, פחות העתקה, יותר בהירות. מרכזים את פרטי הטיסה, מכינים מסמכים ומראים לנוסע בדיוק איך להתקדם.</p>
                <div className="flex flex-wrap items-center gap-4 mt-7">
                    <Button disabled={!!busy} loading={busy === "demo"} icon={<Play size={17} />} onClick={() => void run("demo", demonstrate)} className="demo-start">{claim ? "הפעל שוב את ההדגמה" : "בואו נראה את המערכת עובדת"}</Button>
                    <a href="#demo-value" className="inline-flex items-center gap-2 text-sm text-teal-100">מה זה חוסך לי? <ArrowUpLeft size={16} /></a>
                </div>
                <p className="mt-5 text-xs text-slate-300 leading-6">תרחיש בדיקה עם שמירה ו־PDF אמיתיים. אין שליחת מייל, פנייה לחברה או העברת כסף בהפעלה הזאת.</p>
            </div>
            <div className="demo-ticket" aria-label="מסלול טיסת ההדגמה">
                <div className="flex justify-between items-center text-xs"><span>כרטיס ההדגמה שלך</span><span className="demo-tag">DEMO</span></div>
                <div className="demo-route" dir="ltr"><strong>TLV</strong><span className="demo-flight-path"><Plane size={23} /></span><strong>LHR</strong></div>
                <div className="flex justify-between text-sm"><span>{tracked ? `${tracked.flight.airline} · ${tracked.flight.flightNumber}` : "אל על · LY315"}</span><span>תל אביב ← לונדון</span></div>
                <div className="demo-ticket-bottom"><span>{stage >= 2 ? "זוהה איחור בתרחיש" : "מוכנים להמריא עם הדמו"}</span><strong>{stage >= 2 ? "480 דקות" : "3 שלבים"}</strong></div>
            </div>
        </section>

        {error && <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800">{error}</p>}
        {notice && <p role="status" className="rounded-2xl bg-blue-50 p-4 text-blue-900">{notice}</p>}
        <section className="demo-panel" aria-busy={busy === "demo"}>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6"><div><p className="demo-eyebrow">הוכחה, לא רק הבטחה</p><h2>כך זה קורה, צעד אחרי צעד</h2></div><span aria-live="polite" className="demo-counter">{stage} / 3 שלבים הושלמו</span></div>
            <div className="demo-steps">{steps.map(({title,text,icon:Icon}, index) => <article key={title} className={`demo-step ${stage > index ? "is-done" : ""} ${busy === "demo" && stage === index ? "is-active" : ""}`}>
                <div className="demo-step-icon">{stage > index ? <Check size={22} /> : <Icon size={22} />}</div><span className="demo-step-number">0{index+1}</span><h3>{title}</h3><p>{text}</p><small>{stage > index ? "אושר על ידי השרת" : busy === "demo" && stage === index ? "בתהליך…" : "ממתין להפעלה"}</small>
            </article>)}</div>
            <div className="demo-result" aria-live="polite">{claim ? <>
                <div><span className="demo-eyebrow">המסמך מוכן</span><h3>מפרטי טיסה לתיק שאפשר לפתוח.</h3><p>השרת החזיר את התוצאה בתוך {elapsed?.toFixed(1)} שניות בהרצה הזאת. הפעלה חוזרת עשויה להחזיר תיק קיים.</p><p className="text-xs mt-2">סכום בדמו: {claim.amountIls.toLocaleString("he-IL")} ₪ · סימולציה בלבד, אינה קביעת זכאות.</p></div>
                <div className="flex flex-wrap gap-2"><Button disabled={!!busy} icon={<Download size={16}/>} onClick={() => void run("pdf", () => claimsService.downloadPdf(claim))}>פתח את ה־PDF</Button><Link to="/claims" className="btn btn-secondary">התיק שלי</Link></div>
            </> : <div><h3>{busy === "demo" ? "המערכת עובדת בשבילך…" : "כאן תופיע התוצאה שלך"}</h3><p>לחיצה אחת מפעילה יצירה, עדכון איחור ובדיקת המסמך. ההתקדמות משתנה רק לאחר תשובת השרת.</p></div>}</div>
        </section>

        <section id="demo-value" className="demo-panel">
            <p className="demo-eyebrow">פחות התעסקות. יותר שליטה.</p><h2>מה הנוסע מפסיק לעשות לבד?</h2>
            <div className="demo-comparison mt-6"><div><h3>בדרך הידנית</h3>{["לבדוק שוב ושוב מה קורה לטיסה", "לאסוף ולהעתיק פרטי טיסה והזמנה", "לחפש את ערוץ הפנייה של החברה", "לנסח פנייה ולהבין מה לצרף"].map(text=><p key={text}><span className="text-slate-400">—</span>{text}</p>)}</div><div className="demo-assisted"><h3>עם SureFlight</h3>{["מעקב מתוזמן מול ספק נתוני הטיסות", "ריכוז פרטים והפקת מסמך מהנתונים", "קישורים והנחיות לאל על ולארקיע", "נוסח פנייה מוכן ורשימת מסמכים"].map(text=><p key={text}><Check size={16}/>{text}</p>)}</div></div>
            <p className="mt-5 text-xs text-muted leading-6">ארבע משימות שהמערכת מסייעת בהן. לא נמדד עדיין חיסכון ממוצע בזמן או שיעור הצלחה בתביעות; זמן ההרצה שמוצג למעלה נמדד בפועל בדמו בלבד.</p>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
            <section className="demo-panel"><span className="demo-feature-icon"><Mail /></span><p className="demo-eyebrow">מגיעים לנוסע עם הצעד הבא</p><h2>לא רק התראה. גם דרך לפעול.</h2><p className="demo-description">במעקב אמיתי, שיבוש בטיסה נתמכת יוצר חבילת פנייה שנשלחת לנוסע כששליחת המייל מופעלת.</p>
                <div className="demo-mail"><span>תצוגת תוכן לדוגמה · לא נשלח מהדמו</span><h3>עדכון על הטיסה שלך והנחיות להמשך</h3><p>פרטי הטיסה וההזמנה, סיכום השיבוש, PDF, קישור לחברת התעופה ונוסח שאפשר להעתיק לפנייה.</p><div className="demo-attachment"><FileText size={18}/> SureFlight.pdf</div></div>
            </section>
            <section className="demo-panel"><span className="demo-feature-icon"><ExternalLink /></span><p className="demo-eyebrow">השלב הבא מול חברת התעופה</p><h2>גם עזרה במילוי הטופס.</h2><p className="demo-description">במסך התביעות אפשר להפעיל סיוע במילוי אל על. הוא פותח דפדפן במחשב שמריץ את הבאקנד ומעתיק פרטים שהוא מצליח לזהות. פרטים חסרים, אימות, תאריך וקבצים דורשים השלמה ידנית.</p>
                <div className="rounded-xl bg-amber-50 p-4 text-sm leading-7 my-5">ההזמנה בדמו אינה הזמנה אמיתית. להצגה אפשר לפתוח את הטופס הרשמי; למילוי משתמשים בפרטי הזמנה אמיתיים. המערכת אינה מגישה את הפנייה עבורך.</div>
                <a href="https://contactus.elal.com/contactus" target="_blank" rel="noopener noreferrer" className="btn btn-primary">פתח את טופס אל על <ExternalLink size={15}/></a>
            </section>
        </div>
        <section className="demo-panel flex flex-wrap gap-6 items-center justify-between"><div className="max-w-xl"><p className="demo-eyebrow">מחוברים גם לעולם שבחוץ</p><h2>רוצים לראות נתון מהספק?</h2><p className="demo-description">בקשה אמיתית ל־Aviationstack, עד פעם בדקה. צורכת בקשה מהמכסה ואינה יוצרת הזמנה.</p></div><Button disabled={!!busy} loading={busy === "live"} variant="secondary" icon={<Radar size={17}/>} onClick={() => void run("live", async()=>setLive(await request("GET", "/demo/live")))}>שלוף טיסה פעילה</Button>
            {live && <div className="w-full rounded-xl bg-teal-50 p-5"><strong dir="ltr" className="block text-xl">{String(live.flightNumber ?? "—")} · {String(live.departureAirport ?? "—")} → {String(live.arrivalAirport ?? "—")}</strong><p className="mt-2">{String(live.airline ?? "—")} · {String(live.status ?? "—")}</p></div>}
        </section>
        <details className="demo-panel"><summary className="cursor-pointer font-semibold">מאחורי הקלעים · בקשות השרת</summary><p className="text-sm text-muted my-4">למי שרוצה לראות את הבקשות האמיתיות ששימשו את ההדגמה.</p>{logs.length === 0 && <p className="text-sm">טרם הופעלה בקשה.</p>}{logs.map((log,index)=><details key={index} className="border-t border-line py-3"><summary dir="ltr" className="cursor-pointer text-sm font-mono">{log.request} → {log.status}</summary><pre dir="ltr" className="mt-3 max-h-64 overflow-auto text-xs text-left">{JSON.stringify(log.body,null,2)}</pre></details>)}</details>
        <p className="text-center text-xs text-muted pb-3">SureFlight מרכזת את הטיפול. הנוסע בודק את הפרטים, משלים את הנדרש ושולח את הפנייה.</p>
    </div>;
}
