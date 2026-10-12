import PDFDocument from "pdfkit";
import { existsSync } from "node:fs";

export const PDF_VERSION = "SureFlight-Unicode-v2";
const unicodeFont = process.env.PDF_FONT_PATH || "C:/Windows/Fonts/arial.ttf";

/** Produce the package in memory so its bytes commit atomically with its claim. */
export function generateClaimPdf({ claim, flight, passenger, pnr, reason }) {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({
            size: "A4",
            margin: 52,
            info: { Title: "SureFlight claim package", Author: "SureFlight", Subject: PDF_VERSION },
        });
        if (!existsSync(unicodeFont)) {
            reject(new Error("Set PDF_FONT_PATH to a TrueType font supporting Hebrew"));
            return;
        }
        doc.registerFont("Unicode", unicodeFont);
        const chunks = [];
        doc.on("data", (chunk) => chunks.push(chunk));
        doc.on("error", reject);
        doc.on("end", () => resolve(Buffer.concat(chunks)));
        doc.fontSize(26).fillColor("#123548").text("SureFlight");
        doc.moveDown(0.3).fontSize(17).text("Compensation claim package");
        doc.moveDown()
            .fontSize(10)
            .fillColor("#52636F")
            .text("PROTOTYPE | MOCK PAYOUT | ILS");
        doc.moveDown().fillColor("#123548").fontSize(11);
        const rows = [
            ["Claim reference", claim.id],
            ["Passenger", passenger.name],
            ["Email", passenger.email],
            ["Booking reference (PNR)", pnr],
            ["Airline", flight.airline],
            ["Flight number", flight.flightNumber],
            ["Route", `${flight.departureAirport} to ${flight.arrivalAirport}`],
            [
                "Scheduled departure (UTC)",
                new Date(flight.scheduledDeparture).toISOString(),
            ],
            [
                "Scheduled arrival (UTC)",
                new Date(flight.scheduledArrival).toISOString(),
            ],
            [
                "Distance",
                `${Number(flight.distanceKm).toFixed(2)} km (great-circle)`,
            ],
            [
                "Disruption",
                reason === "CANCELLATION"
                    ? "Cancelled flight"
                    : `Delay of ${flight.delayMinutes} minutes`,
            ],
            [
                "Calculated compensation",
                `ILS ${claim.amountIls.toLocaleString("en-US")}`,
            ],
            ["Generated (UTC)", new Date(claim.createdAt).toISOString()],
        ];
        for (const [label, value] of rows) {
            const y = doc.y;
            const text = String(value);
            const hebrew = /[\u0590-\u05ff]/.test(text);
            doc.font("Helvetica-Bold").fontSize(10).text(label, 52, y, { width: 165, lineBreak: false });
            doc.font("Unicode").fontSize(11);
            let size = 11;
            while (doc.widthOfString(text, { features: [] }) > 310 && size > 7) doc.fontSize(--size);
            doc.text(text, 225, y, { width: 318, align: hebrew ? "right" : "left", features: [], lineBreak: false });
            doc.x = 52;
            doc.y = y + 27;
        }
        doc.moveDown()
            .fontSize(10)
            .fillColor("#52636F")
            .text(
                "This package records the configured demonstration policy: cancellation or a delay of at least 480 minutes; ILS 1,530 up to 2,000 km, ILS 2,450 up to 4,500 km, and ILS 3,670 above 4,500 km. Eligibility exceptions, jurisdiction, and statutory updates are not assessed. No airline submission or real payment has been made.",
                { lineGap: 3 }
            );
        doc.end();
    });
}
