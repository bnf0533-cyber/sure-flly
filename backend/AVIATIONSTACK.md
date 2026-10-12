# Aviationstack

In backend/.env set:

    FLIGHT_PROVIDER=aviationstack
    AVIATIONSTACK_API_KEY=your-key

Restart the backend with npm run dev. Use FLIGHT_PROVIDER=mock for the old demo mode.

app.js chooses the provider. services/aviationstack.service.js calls Aviationstack using built-in fetch and translates its response. The existing tracker saves the result through flights.services.js and the DAL.

Registration still uses the existing form. Enter the IATA flight number (e.g. LY315), correct airports and exact scheduled departure. The provider matches the departure instant, not just the number, to avoid updating a different day's flight. It queries current flights without the paid historical date filter. Future or past flights absent from the current API results stay unchanged. Unknown/diverted statuses and missing arrival delay also stay unchanged and produce a tracker log.

The API key stays in backend/.env. Requests use HTTPS and a 10-second timeout. API errors never include the key or request URL. There is no automatic HTTP fallback. Your plan must allow the requested endpoint and HTTPS.

There is one request per active flight at startup and each hour. For example, one flight active for 24 hours uses about 24 requests plus restarts. Check your account quota. TRACKER_ENABLED=false disables polling. Manual admin status updates are allowed only in mock mode. Existing compensation rules and simulated payments are unchanged.

Run the isolated provider tests (no key, network or database required):

    node --test tests/aviationstack.test.js
