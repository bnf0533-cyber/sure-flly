import { chromium } from "playwright";

/**
 * Automates opening El Al's claim form and filling out passenger and flight details.
 * Uses stealth configuration to bypass Link11 / Reblaze bot challenges and loads the live form.
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

    let browser;
    try {
        // Try launching using installed Chrome first for highest trust score, fallback to bundled Chromium
        browser = await chromium.launch({
            channel: "chrome",
            headless: false,
            ignoreDefaultArgs: ["--enable-automation"],
            args: [
                "--disable-blink-features=AutomationControlled",
                "--start-maximized",
                "--no-sandbox",
                "--disable-infobars",
            ],
        });
    } catch {
        browser = await chromium.launch({
            headless: false,
            ignoreDefaultArgs: ["--enable-automation"],
            args: [
                "--disable-blink-features=AutomationControlled",
                "--start-maximized",
                "--no-sandbox",
                "--disable-infobars",
            ],
        });
    }

    const context = await browser.newContext({
        viewport: null, // Full screen
        locale: "he-IL",
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    });

    // Remove automation signatures
    await context.addInitScript(() => {
        delete Object.getPrototypeOf(navigator).webdriver;
        Object.defineProperty(navigator, "webdriver", { get: () => undefined });
    });

    const page = await context.newPage();

    try {
        // 1. Navigate to El Al Customer Contact form
        await page.goto("https://contactus.elal.com/contactus", {
            waitUntil: "domcontentloaded",
            timeout: 30000,
        });

        // 2. Wait for the security challenge / redirect to complete (rid=...)
        await page.waitForURL(/rid=/, { timeout: 15000 }).catch(() => {});
        await page.waitForTimeout(3500);

        // 3. Handle frequent flyer question: Click "אינני נוסע מתמיד"
        try {
            const notMatmid = page.locator("button:has-text('אינני נוסע מתמיד'), button.MatmidBtn").first();
            if (await notMatmid.isVisible({ timeout: 6000 })) {
                await notMatmid.click();
                await page.waitForTimeout(2500);
            }
        } catch {
            logger.info("Frequent flyer bypass step already completed or not displayed");
        }

        // 4. Prepare passenger details
        const nameParts = (passenger.name || "נוסע ישראלי").trim().split(/\s+/);
        const firstName = nameParts[0] || "ישראל";
        const lastName = nameParts.slice(1).join(" ") || "ישראלי";
        const lastNameEnglish = toEnglishLastName(lastName);
        const flightNumber = (flight.flightNumber || "LY").replace(/\s/g, "");
        const bookingRef = (pnr || "LY1234").trim().toUpperCase();

        // 5. Fill initial booking identification fields: PNR and Last Name
        try {
            const textInputs = page.locator("input[type='text'], input:not([type])");
            const inputCount = await textInputs.count();
            if (inputCount >= 1) {
                await textInputs.nth(0).click();
                await textInputs.nth(0).fill(bookingRef);
                await textInputs.nth(0).dispatchEvent("input");
                await textInputs.nth(0).dispatchEvent("change");
            }
            if (inputCount >= 2) {
                await textInputs.nth(1).click();
                await textInputs.nth(1).fill(lastNameEnglish);
                await textInputs.nth(1).dispatchEvent("input");
                await textInputs.nth(1).dispatchEvent("change");
            }
        } catch (fillError) {
            logger.warn("Could not fill PNR/Last name fields directly", fillError.message);
        }

        // 6. Fill any other matching fields that may exist on the page
        await fillFieldIfExists(page, ['input[name*="first" i]', 'input[placeholder*="פרטי" i]', '#firstName'], firstName);
        await fillFieldIfExists(page, ['input[name*="last" i]', 'input[placeholder*="משפחה" i]', '#lastName'], lastName);
        await fillFieldIfExists(page, ['input[type="email"]', 'input[name*="email" i]', '#email'], passenger.email || "");
        await fillFieldIfExists(page, ['input[type="tel"]', 'input[name*="phone" i]', '#phone'], passenger.phone || "0501234567");

        const delayNotice = flight.status === "CANCELLED"
            ? "בוטלה"
            : `התעכבה ב-${flight.delayMinutes || 0} דקות`;

        const messageText = `שלום רב,
הנני פונה בעניין טיסה ${flightNumber} מתאריך ${new Date(flight.scheduledDeparture).toLocaleDateString("he-IL")}, אשר ${delayNotice}.
מספר הזמנה (PNR): ${bookingRef}.
בהתאם לחוק שירותי תעופה (פיצוי וסיוע בשל ביטול טיסה או שינוי בתנאיה), הנני זכאי לפיצוי כספי כחוק בסך ${claim?.amountIls || 2450} ₪.
מצורפים פרטי הבקשה לבדיקתכם ולתשלום הפיצוי בהקדם.
תודה,
${passenger.name}`;

        await fillFieldIfExists(page, ['textarea', 'textarea[name*="message" i]', '#message'], messageText);

        await page.bringToFront();
        logger.info("El Al form opened and populated successfully. Browser is open on user's screen.");

        // Keep browser open for user to review and interact
        setTimeout(() => {
            browser.close().catch(() => {});
        }, 1800000).unref();

        return {
            success: true,
            message: "אתר אל על נפתח מולך עם כל הפרטים וה-PNR! תוכל לבדוק, ללחוץ 'המשך' ולאשר.",
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
    if (!value) return false;
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

function toEnglishLastName(hebrewOrEnglishName) {
    if (!hebrewOrEnglishName) return "Israeli";
    const englishOnly = hebrewOrEnglishName.replace(/[^a-zA-Z]/g, "").trim();
    if (englishOnly.length >= 2) return englishOnly;

    const commonMap = {
        "ישראלי": "Israeli", "כהן": "Cohen", "לוי": "Levi", "מזרחי": "Mizrahi",
        "פרץ": "Peretz", "ביטון": "Biton", "דהן": "Dahan", "אברהם": "Avraham",
        "פרידמן": "Friedman", "מלכה": "Malka", "אזולאי": "Azulay", "כץ": "Katz",
        "יוסף": "Yosef", "חדד": "Hadad", "עמר": "Amar", "אוחיון": "Ohayon",
        "חיים": "Haim", "דוד": "David", "שלום": "Shalom", "ברוך": "Baruch",
    };
    return commonMap[hebrewOrEnglishName.trim()] || "Israeli";
}
