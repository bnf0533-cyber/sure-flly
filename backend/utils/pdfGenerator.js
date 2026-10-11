import PDFDocument from "pdfkit";

/** Produce the package in memory so its bytes commit atomically with its claim. */
export function generateClaimPdf({ claim, flight, passenger, pnr, reason }) {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({
            size: "A4",
            margin: 52,
            info: { Title: "SureFlight claim package", Author: "SureFlight" },
        });
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
            ["Flight", `${flight.airline} / ${flight.flightNumber}`],
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
            doc.font("Helvetica-Bold").text(`${label}: `, { continued: true });
            doc.font("Helvetica").text(String(value)).moveDown(0.6);
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
