# Passenger email workflow

Configure backend/.env with SMTP_USER, SMTP_PASS (Google app password), SMTP_HOST=smtp.gmail.com, SMTP_PORT=465.
Keep EMAIL_ENABLED=false during setup. Run npm run mail:test (EL AL) or npm run mail:test -- arkia to send explicitly labelled sample documents to the authorized SMTP_TEST_TO address. Do not commit secrets.

After a successful test, set EMAIL_ENABLED=true and restart the backend. The email worker checks persisted pending records at startup and every 30 seconds. Keep the backend running. No external scheduler is required for local operation.

For real Aviationstack flights with an LY or IZ number, any reported arrival delay above zero or cancellation creates one READY information package per tracked booking. No eligibility or payout is asserted. Other airlines and demo records are not automatically emailed. The PDF and message describe the observation, including the possibility of estimates, and direct the passenger to submit their own request.

SENT means the SMTP server accepted the recipient; inbox placement is not guaranteed. Definite failures retry up to three times with delays. UNKNOWN means the connection or process failed at an ambiguous point: inspect the sender's Sent folder before manually re-queuing. Stable Message-ID helps diagnostics but SMTP cannot guarantee exactly-once delivery. Sent records are not re-sent on restart.

Official form entry points verified 2026-10-12:
- EL AL: https://contactus.elal.com/contactus (frequent flyer choice, then identification)
- Arkia: https://ext.arkia.co.il/contactus/ (mobile verification)
- Google app passwords: https://support.google.com/accounts/answer/185833

Field labels behind airline identity checks are not verified. The message provides values and draft text without inventing hidden labels. Passengers supply phone, ticket number, boarding pass and receipts from their own documents. No airline form is submitted by this application.

New PDFs embed the configured Hebrew font. On this local Windows setup Arial is used; set PDF_FONT_PATH for a different machine.
