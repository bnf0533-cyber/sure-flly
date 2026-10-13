import { launchElAlAutoFill } from "../services/elalAutomation.service.js";

console.log("🚀 מפעיל את האוטומציה של אל על כעת... חלון דפדפן יפתח מיד על שולחן העבודה שלך!");

const result = await launchElAlAutoFill({
    passenger: {
        name: "חיים ישראלי",
        email: "chaim05041056@gmail.com",
        phone: "0501234567",
    },
    flight: {
        flightNumber: "LY315",
        status: "DELAYED",
        delayMinutes: 480,
        scheduledDeparture: new Date().toISOString(),
    },
    pnr: "LY9876",
    claim: {
        amountIls: 2450,
    },
    logger: console,
});

console.log("תוצאה:", result);
