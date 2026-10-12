import test from "node:test";
import assert from "node:assert/strict";
import { createAviationstackProvider } from "../services/aviationstack.service.js";

const flight = { flightNumber: "LY315", departureAirport: "TLV", arrivalAirport: "LHR",
    scheduledDeparture: "2026-10-12T10:00:00Z", delayMinutes: 0 };
function row(status = "active") {
    return { flight: { iata: "LY315" }, flight_status: status,
        departure: { iata: "TLV", scheduled: flight.scheduledDeparture },
        arrival: { iata: "LHR", scheduled: "2026-10-12T15:00:00Z", estimated: "2026-10-12T16:00:00Z", delay: 60 } };
}
function provider(data) {
    return createAviationstackProvider({ apiKey: "test-secret", fetchFn: async (url, options) => {
        assert.equal(url.protocol, "https:");
        assert.equal(url.searchParams.get("flight_iata"), "LY315");
        assert.equal(url.searchParams.has("flight_date"), false);
        assert.ok(options.signal);
        return { ok: true, status: 200, json: async () => ({ data }) };
    } });
}
test("maps arrival delay and matches the correct day", async () => {
    const old = row("cancelled"); old.departure.scheduled = "2026-10-11T10:00:00Z";
    assert.deepEqual(await provider([old, row()]).getStatus(flight), { status: "DELAYED", delayMinutes: 60 });
});
test("actual landing time overrides estimate and reported delay", async () => {
    const data = row("landed"); data.arrival.actual = "2026-10-12T15:10:00Z";
    assert.deepEqual(await provider([data]).getStatus(flight), { status: "LANDED", delayMinutes: 10 });
});
test("maps cancellation and on-time flight", async () => {
    assert.equal((await provider([row("cancelled")]).getStatus(flight)).status, "CANCELLED");
    const data = row(); data.arrival.estimated = data.arrival.scheduled;
    assert.deepEqual(await provider([data]).getStatus(flight), { status: "SCHEDULED", delayMinutes: 0 });
});
test("does not update a missing, ambiguous or diverted flight", async () => {
    for (const data of [[], [row(), row()], [row("diverted")]]) {
        await assert.rejects(provider(data).getStatus(flight));
    }
});
test("rejects wrong routes and dates, accepts equivalent time zones", async () => {
    const wrong = row(); wrong.arrival.iata = "JFK";
    await assert.rejects(provider([wrong]).getStatus(flight));
    const correct = row(); correct.departure.scheduled = "2026-10-12T13:00:00+03:00";
    assert.equal((await provider([correct]).getStatus(flight)).delayMinutes, 60);
});
test("missing arrival delay must not become zero or departure delay", async () => {
    const data = row(); data.arrival.estimated = null; data.arrival.delay = null; data.departure.delay = 500;
    await assert.rejects(provider([data]).getStatus(flight), /arrival delay/);
    data.arrival.delay = "90";
    assert.equal((await provider([data]).getStatus(flight)).delayMinutes, 90);
});
test("requires key and sanitizes network, HTTP and API errors", async () => {
    assert.throws(() => createAviationstackProvider({ apiKey: " " }), /AVIATIONSTACK_API_KEY/);
    for (const fetchFn of [
        async () => { throw new Error("https://example.com?access_key=test-secret"); },
        async () => ({ ok: false, status: 429, json: async () => ({}) }),
        async () => ({ ok: true, status: 200, json: async () => ({ error: { info: "test-secret" } }) }),
        async () => ({ ok: true, status: 200, json: async () => ({}) }),
    ]) {
        const service = createAviationstackProvider({ apiKey: "test-secret", fetchFn });
        await assert.rejects(service.getStatus(flight), (error) => !error.message.includes("test-secret"));
    }
});

test("fractional delay never rounds up to compensation threshold", async () => {
    const data = row("landed");
    data.arrival.actual = "2026-10-12T22:59:59Z";
    assert.equal((await provider([data]).getStatus(flight)).delayMinutes, 479);
    data.arrival.actual = "2026-10-12T23:00:00Z";
    assert.equal((await provider([data]).getStatus(flight)).delayMinutes, 480);
});
test("null API rows are ignored and invalid delay values are rejected", async () => {
    assert.equal((await provider([null, row()]).getStatus(flight)).delayMinutes, 60);
    for (const delay of [false, true, " ", -1, {}, []]) {
        const data = row(); data.arrival.estimated = null; data.arrival.delay = delay;
        await assert.rejects(provider([data]).getStatus(flight), /arrival delay/);
    }
});
