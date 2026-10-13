import { chromium } from "playwright";

const FORM_URL = "https://contactus.elal.com/contactus";
const incomplete = message => ({ success: false, message });

// Only copy known values. Names must match the ticket, never be transliterated.
export async function fillElAlForm(page, { passenger, flight, pnr }) {
    const name = (passenger.name || "").trim();
    const parts = /^[A-Za-z][A-Za-z '\-]+$/.test(name) ? name.split(/\s+/) : [];
    const lastName = parts.length > 1 ? parts.slice(1).join(" ") : "";
    const missing = [];
    async function fill(label, field, value) {
        if (!value || await field.count() !== 1 || !await field.isVisible()) {
            missing.push(label);
            return;
        }
        await field.fill(value);
        if (await field.inputValue() !== value) throw new Error("Field value was not retained");
    }
    const byLabel = pattern => page.getByLabel(pattern);
    await page.goto(FORM_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
    const guest = page.getByRole("button", { name: "אינני נוסע מתמיד", exact: true });
    if (await guest.count() === 1 && await guest.isVisible()) await guest.click();
    await fill("מספר הזמנה", byLabel(/PNR|מספר הזמנה|קוד הזמנה/i), (pnr || "").trim().toUpperCase());
    await fill("שם משפחה באנגלית כפי שמופיע בכרטיס", byLabel(/last name|שם משפחה/i), lastName);
    if (missing.length) return incomplete("נדרשת השלמה ידנית: " + missing.join(", ") + ". לא נשלחה פנייה.");
    await page.getByRole("button", { name: "המשך", exact: true }).click();
    await page.waitForURL(/page2/, { timeout: 15000 });
    await fill("מספר טיסה", byLabel(/flight number|מספר טיסה/i), flight.flightNumber.replace(/^LY/i, ""));
    await fill("שם פרטי", byLabel(/first name|שם פרטי/i), parts[0]);
    await fill("שם משפחה", byLabel(/last name|שם משפחה/i), lastName);
    await fill("טלפון", page.locator('input[type="tel"]'), passenger.phone?.trim());
    await fill("אימייל", page.locator('input[type="email"]'), passenger.email?.trim());
    // Departure airport's local date cannot be inferred safely from the server timezone.
    return incomplete("הפרטים שזוהו מולאו. יש להשלים ידנית תאריך טיסה לפי הכרטיס, תוכן הפנייה וקבצים" +
        (missing.length ? ", וכן: " + missing.join(", ") : "") + ". לא נשלחה פנייה.");
}

export async function launchElAlAutoFill({ passenger, flight, pnr, browserType = chromium, timeoutMs = 90000 }) {
    if (!/^LY\d+$/i.test(flight.flightNumber?.replace(/\s/g, "") || ""))
        return incomplete("המילוי מיועד לטיסות אל על בלבד.");
    let browser, timer, expired = false;
    const work = async () => {
        try { browser = await browserType.launch({ channel: "chrome", headless: false, timeout: 15000 }); }
        catch { if (expired) throw new Error("Timed out"); browser = await browserType.launch({ headless: false, timeout: 15000 }); }
        if (expired) { await browser.close(); throw new Error("Timed out"); }
        const context = await browser.newContext({ locale: "he-IL" });
        const page = await context.newPage();
        page.setDefaultTimeout(5000);
        const result = await fillElAlForm(page, { passenger, flight, pnr });
        await page.bringToFront();
        return result;
    };
    try {
        return await Promise.race([work(), new Promise((_, reject) => {
            timer = setTimeout(() => { expired = true; void browser?.close().catch(() => {}); reject(new Error("Timed out")); }, timeoutMs);
        })]);
    } catch {
        return incomplete(browser && !expired
            ? "המילוי לא הושלם. בדוק את הטופס בדפדפן והשלם ידנית; לא נשלחה פנייה."
            : "לא ניתן להשלים את פתיחת הטופס בזמן שהוקצב. לא נשלחה פנייה.");
    } finally {
        clearTimeout(timer);
        if (browser && !expired) setTimeout(() => void browser.close().catch(() => {}), 1800000).unref();
    }
}
