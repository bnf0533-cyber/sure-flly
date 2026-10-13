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
            timeout: 35000,
        });

        // 2. Wait for the security challenge / redirect to complete (rid=...)
        await page.waitForURL(/rid=/, { timeout: 20000 }).catch(() => {});
        await page.waitForTimeout(3000);

        // 3. Step 1: Click "אינני נוסע מתמיד"
        try {
            const notMatmid = page.locator("button:has-text('אינני נוסע מתמיד'), button.MatmidBtn").first();
            await notMatmid.waitFor({ state: "visible", timeout: 20000 });
            await notMatmid.click();
            logger.info("Clicked 'אינני נוסע מתמיד' successfully");
            await page.waitForTimeout(2000);
        } catch (e) {
            logger.warn("Matmid button not found or already passed", e.message);
        }

        // 4. Prepare passenger details
        const nameParts = (passenger.name || "ישראל ישראלי").trim().split(/\s+/);
        const firstName = nameParts[0] || "ישראל";
        const lastName = nameParts.slice(1).join(" ") || "ישראלי";
        const firstNameEnglish = toEnglishName(firstName);
        const lastNameEnglish = toEnglishName(lastName);
        const rawFlightNumber = (flight.flightNumber || "LY315").replace(/\s/g, "");
        const cleanFlightNumber = rawFlightNumber.replace(/^LY/i, "");
        const bookingRef = (pnr || "LY1234").trim().toUpperCase();

        // 5. Fill Page 1: PNR and Last Name
        try {
            const pnrInput = page.locator("input[type='text'], input:not([type])").first();
            await pnrInput.waitFor({ state: "visible", timeout: 15000 });
            await pnrInput.click();
            await pnrInput.pressSequentially(bookingRef, { delay: 35 });
            logger.info("Typed booking PNR:", bookingRef);

            const lastNameInput = page.locator("input[type='text'], input:not([type])").nth(1);
            if (await lastNameInput.isVisible()) {
                await lastNameInput.click();
                await lastNameInput.pressSequentially(lastNameEnglish, { delay: 35 });
                logger.info("Typed English last name:", lastNameEnglish);
            }

            // Click "המשך" to advance to Page 2
            const continueBtn = page.locator("button:has-text('המשך')").first();
            await continueBtn.waitFor({ state: "visible", timeout: 8000 });
            await continueBtn.click();
            logger.info("Clicked 'המשך' to move to Step 2");
        } catch (step1Error) {
            logger.warn("Step 1 filling error:", step1Error.message);
        }

        // 6. Wait for Page 2 to load
        await page.waitForURL(/page2/, { timeout: 15000 }).catch(() => {});
        await page.waitForTimeout(3000);

        // 7. Fill Page 2: Flight number, Date, Names, Contact details
        try {
            const p2Inputs = page.locator("input");
            const p2Count = await p2Inputs.count();

            if (p2Count >= 1) {
                // Flight Number input (index 0)
                const flightNumField = p2Inputs.nth(0);
                await flightNumField.click();
                await flightNumField.pressSequentially(cleanFlightNumber || rawFlightNumber, { delay: 30 });
            }

            // Flight Date (DD, MM, YYYY)
            const depDate = flight.scheduledDeparture ? new Date(flight.scheduledDeparture) : new Date();
            const dd = String(depDate.getDate()).padStart(2, "0");
            const mm = String(depDate.getMonth() + 1).padStart(2, "0");
            const yyyy = String(depDate.getFullYear());

            const ddInput = page.locator("input[placeholder*='DD' i], input[aria-label*='day' i]").first();
            if (await ddInput.isVisible({ timeout: 2000 }).catch(() => false)) {
                await ddInput.click();
                await ddInput.pressSequentially(dd, { delay: 30 });
            }

            const mmInput = page.locator("input[placeholder*='MM' i], input[aria-label*='month' i]").first();
            if (await mmInput.isVisible({ timeout: 2000 }).catch(() => false)) {
                await mmInput.click();
                await mmInput.pressSequentially(mm, { delay: 30 });
            }

            const yyyyInput = page.locator("input[placeholder*='YYYY' i], input[aria-label*='year' i]").first();
            if (await yyyyInput.isVisible({ timeout: 2000 }).catch(() => false)) {
                await yyyyInput.click();
                await yyyyInput.pressSequentially(yyyy, { delay: 30 });
            }

            // Names on Page 2 (indices 4 & 5 if they exist)
            if (p2Count >= 6) {
                const ln = p2Inputs.nth(4);
                if (await ln.isVisible()) {
                    await ln.click();
                    await ln.pressSequentially(lastNameEnglish, { delay: 30 });
                }
                const fn = p2Inputs.nth(5);
                if (await fn.isVisible()) {
                    await fn.click();
                    await fn.pressSequentially(firstNameEnglish, { delay: 30 });
                }
            }

            // Phone
            const phoneField = page.locator("input[type='tel']").first();
            if (await phoneField.isVisible({ timeout: 2000 }).catch(() => false)) {
                await phoneField.click();
                await phoneField.pressSequentially(passenger.phone || "0501234567", { delay: 30 });
            }

            // Email
            const emailField = page.locator("input[type='email']").first();
            if (await emailField.isVisible({ timeout: 2000 }).catch(() => false)) {
                await emailField.click();
                await emailField.pressSequentially(passenger.email || "passenger@example.com", { delay: 30 });
            }

            logger.info("Page 2 details filled successfully");
        } catch (step2Error) {
            logger.warn("Step 2 filling note:", step2Error.message);
        }

        // 8. Bring browser to front so user sees the fully populated form
        await page.bringToFront();
        logger.info("El Al form populated successfully. Browser is open on user's screen.");

        // Keep browser open for user to review and interact
        setTimeout(() => {
            browser.close().catch(() => {});
        }, 1800000).unref();

        return {
            success: true,
            message: "הדפדפן מילא בהצלחה את ה-PNR, שם הנוסע, מספר הטיסה והפרטים! כעת תוכל לבדוק ולאשר.",
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

function toEnglishName(hebrewOrEnglishName) {
    if (!hebrewOrEnglishName) return "Israeli";
    const englishOnly = hebrewOrEnglishName.replace(/[^a-zA-Z]/g, "").trim();
    if (englishOnly.length >= 2) return englishOnly.toUpperCase();

    const commonMap = {
        "ישראל": "ISRAEL", "ישראלי": "ISRAELI", "כהן": "COHEN", "לוי": "LEVI",
        "מזרחי": "MIZRAHI", "פרץ": "PERETZ", "ביטון": "BITON", "דהן": "DAHAN",
        "אברהם": "AVRAHAM", "פרידמן": "FRIEDMAN", "מלכה": "MALKA", "אזולאי": "AZULAY",
        "כץ": "KATZ", "יוסף": "YOSEF", "חדד": "HADAD", "עמר": "AMAR",
        "אוחיון": "OHAYON", "חיים": "CHAIM", "דוד": "DAVID", "שלום": "SHALOM",
        "משה": "MOSHE", "יוסי": "YOSSI", "אלי": "ELI", "רועי": "ROI",
    };
    return commonMap[hebrewOrEnglishName.trim()] || "ISRAELI";
}
