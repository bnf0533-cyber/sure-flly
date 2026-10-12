import { buildAirlineMessage, getAirlineGuide } from "../services/airlineGuides.service.js";
import PDFDocument from "pdfkit";
import { existsSync } from "node:fs";

export const PDF_VERSION = "SureFlight-Unicode-v4";
const unicodeFont = process.env.PDF_FONT_PATH || "C:/Windows/Fonts/arial.ttf";


// Shape Hebrew separately so Latin identifiers, email addresses and numbers stay readable.
function drawLine(doc, text, x, y, width) {
    const rtl = /[\u0590-\u05ff]/.test(text);
    const runs = rtl ? text.split(/([\u0590-\u05ff]+(?:\s+[\u0590-\u05ff]+)*)/).filter(Boolean).reverse() : [text];
    const measure = value => doc.widthOfString(value, { features: [] });
    let cursor = rtl ? x + width - runs.reduce((sum, run) => sum + measure(run), 0) : x;
    for (const run of runs) {
        const leading = run.match(rtl ? /\s*$/ : /^\s*/)[0];
        doc.text(run.trim(), cursor + measure(leading), y, { features: [], lineBreak: false });
        cursor += measure(run);
    }
}

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
        const live = claim.amountIls === 0;
        doc.fontSize(26).fillColor("#123548").text("SureFlight");
        doc.moveDown(0.3).fontSize(17).text(live ? "Flight disruption - passenger information" : "Compensation claim package");
        doc.moveDown()
            .fontSize(10)
            .fillColor("#52636F")
            .text(live ? "PASSENGER COPY | NOT SUBMITTED TO AIRLINE" : "DEMO | MOCK PAYOUT | ILS");
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
                live ? "Compensation decision" : "Calculated compensation",
                live ? "Not determined - request airline review" : `ILS ${claim.amountIls.toLocaleString("en-US")}`,
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
            drawLine(doc, text, 225, y, 318);
            doc.x = 52;
            doc.y = y + 27;
        }
        doc.moveDown()
            .fontSize(10)
            .fillColor("#52636F")
            .text(
                live ? "This report reflects flight tracking data, including estimates that may change. Please compare it with your booking and actual travel. Compensation is not determined, no payment has been made and no request has been submitted to the airline. Submit the attached details yourself and keep your supporting documents." : "This package records the configured demonstration policy: cancellation or a delay of at least 480 minutes; ILS 1,530 up to 2,000 km, ILS 2,450 up to 4,500 km, and ILS 3,670 above 4,500 km. Eligibility exceptions, jurisdiction, and statutory updates are not assessed. No airline submission or real payment has been made.",
                { lineGap: 3 }
            );
        const guide = live && getAirlineGuide(flight);
        if (guide) {
            const message = buildAirlineMessage({ flight, passenger, pnr, guide });
            doc.addPage();
            doc.font("Helvetica-Bold").fontSize(18).fillColor("#123548").text("Submission instructions and draft");
            doc.moveDown().font("Helvetica").fontSize(10).text(guide.url, { link: guide.url, underline: true });
            doc.moveDown();
            // Draw one logical line at a time so Hebrew shaping does not reverse wrapped words.
            for (const paragraph of message.text.split("\n")) {
                const words = paragraph.split(/\s+/);
                let line = "";
                const print = value => {
                    if (doc.y > 735) doc.addPage();
                    const y = doc.y;
                    doc.font("Unicode").fontSize(10).fillColor("#123548");
                    drawLine(doc, value, 52, y, 491);
                    doc.x = 52; doc.y = y + 16;
                };
                doc.font("Unicode").fontSize(10);
                for (const word of words) {
                    const next = line ? line + " " + word : word;
                    if (line && doc.widthOfString(next,{features:[]}) > 485) { print(line); line = word; }
                    else line = next;
                }
                print(line);
            }
        }
        doc.end();
    });
}
