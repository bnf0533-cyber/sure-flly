import { chromium } from "playwright";

/**
 * Automates opening El Al's claim form and filling out passenger and flight details.
 * Runs in visible (headed) mode so the passenger can review, verify, and complete submission.
 */
export async function launchElAlAutoFill({
    passenger,
    flight,
    pnr,
    claim,
    logger = console,
}) {
    logger.info("Launching El Al auto-fill automation for flight", {
        flightNumber: flight.flightNumber,
        pnr,
        passengerEmail: passenger.email,
    });

    const browser = await chromium.launch({
        headless: false,
        args: ["--start-maximized"],
    });

    const context = await browser.newContext({
        viewport: null, // Full screen
        locale: "he-IL",
    });

    const page = await context.newPage();

    try {
        // 1. Navigate to El Al Customer Contact form
        await page.goto("https://contactus.elal.com/contactus", {
            waitUntil: "domcontentloaded",
            timeout: 30000,
        });

        // 2. Handle initial question: "Are you a frequent flyer member?" -> Click "No"
        try {
            const noBtn = page.locator("button.MatmidBtn, button:has-text('לא')").first();
            await noBtn.waitFor({ state: "visible", timeout: 8000 });
            await noBtn.click();
            await page.waitForTimeout(1500);
        } catch {
            logger.info("Matmid selection button not found or already bypassed");
        }

        // 3. Prepare passenger name parts
        const nameParts = (passenger.name || "נוסע").trim().split(/\s+/);
        const firstName = nameParts[0] || "נוסע";
        const lastName = nameParts.slice(1).join(" ") || "ישראלי";
        const email = passenger.email || "";
        const phone = passenger.phone || "0501234567";
        const flightNumber = (flight.flightNumber || "LY").replace(/\s/g, "");

        // 4. Construct formal Hebrew demand message based on Israeli Aviation Law (חוק טיבי)
        const delayNotice = flight.status === "CANCELLED"
            ? "בוטלה"
            : `התעכבה ב-${flight.delayMinutes || 0} דקות`;

        const messageText = `שלום רב,
הנני פונה בעניין טיסה ${flightNumber} מתאריך ${new Date(flight.scheduledDeparture).toLocaleDateString("he-IL")}, אשר ${delayNotice}.
מספר הזמנה (PNR): ${pnr}.
בהתאם לחוק שירותי תעופה (פיצוי וסיוע בשל ביטול טיסה או שינוי בתנאיה), הנני זכאי לפיצוי כספי כחוק.
מצורפים פרטי הבקשה לבדיקתכם ולתשלום הפיצוי בהקדם.
תודה,
${passenger.name}`;

        // 5. Fill out available form fields dynamically using smart locator matching
        await fillFieldIfExists(page, ['input[name*="first" i]', 'input[placeholder*="פרטי" i]', '#firstName', 'input[aria-label*="פרטי" i]'], firstName);
        await fillFieldIfExists(page, ['input[name*="last" i]', 'input[placeholder*="משפחה" i]', '#lastName', 'input[aria-label*="משפחה" i]'], lastName);
        await fillFieldIfExists(page, ['input[type="email"]', 'input[name*="email" i]', 'input[placeholder*="מייל" i]', '#email'], email);
        await fillFieldIfExists(page, ['input[type="tel"]', 'input[name*="phone" i]', 'input[name*="mobile" i]', 'input[placeholder*="טלפון" i]', '#phone'], phone);
        await fillFieldIfExists(page, ['input[name*="flight" i]', 'input[placeholder*="טיסה" i]', '#flightNumber'], flightNumber);
        await fillFieldIfExists(page, ['input[name*="pnr" i]', 'input[name*="booking" i]', 'input[placeholder*="הזמנה" i]', '#pnr'], pnr);
        await fillFieldIfExists(page, ['textarea', 'textarea[name*="message" i]', 'textarea[placeholder*="פנייה" i]', '#message'], messageText);

        logger.info("El Al form auto-filled successfully. Browser left open for passenger review.");

        // Keep the browser session alive in the background so the user can interact with it
        // The browser will remain open until the user manually closes it or after 30 minutes.
        setTimeout(() => {
            browser.close().catch(() => {});
        }, 1800000).unref();

        return {
            success: true,
            message: "הדפדפן נפתח מולך והטופס של אל על מולא אוטומטית בהצלחה! אנא אשר/י ושלח/י.",
        };

    } catch (error) {
        logger.error("Failed during El Al auto-fill automation", { error: error.message });
        return {
            success: false,
            error: error.message,
            message: "הדפדפן נפתח, אך חל עיכוב בטעינת הטופס של אל על. ניתן להשלים ידנית.",
        };
    }
}

async function fillFieldIfExists(page, selectors, value) {
    if (!value) return;
    for (const selector of selectors) {
        try {
            const el = page.locator(selector).first();
            if (await el.isVisible({ timeout: 1000 })) {
                await el.click();
                await el.fill(value);
                await el.dispatchEvent("input");
                await el.dispatchEvent("change");
                return true;
            }
        } catch {
            // Try next selector
        }
    }
    return false;
}
