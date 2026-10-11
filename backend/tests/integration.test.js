import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { EventEmitter, once } from "node:events";
import { test } from "node:test";
import { io as createSocketClient } from "socket.io-client";
import { attachRealtime, createApp } from "../app.js";
import { createDatabase } from "../db/config.db.js";
import { createUserDAL } from "../DAL/user.DAL.js";
import { createAuthService } from "../services/auth.services.js";
import { createUsersService } from "../services/users.services.js";
import { createFlightsService } from "../services/flights.services.js";
import { createTrackedFlightsService } from "../services/trackedFlights.services.js";
import { createClaimsService } from "../services/claims.services.js";
import { createMockPaymentGateway } from "../services/paymentGateway.service.js";
import { signToken } from "../utils/token.js";
import { generateClaimPdf } from "../utils/pdfGenerator.js";

const PASSWORD = "Correct-Horse-Flight-47";
const JWT_SECRET = "integration-test-only-secret-with-at-least-32-characters";

/** Issue a real HTTP request so middleware and controller behavior are exercised. */
async function request(baseUrl, path, { method = "GET", token, body } = {}) {
    const headers = {};
    if (token) headers.authorization = `Bearer ${token}`;
    if (body !== undefined) headers["content-type"] = "application/json";

    const response = await fetch(`${baseUrl}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
    });
    const contentType = response.headers.get("content-type") ?? "";
    const data = contentType.includes("application/json")
        ? await response.json()
        : Buffer.from(await response.arrayBuffer());
    return { response, data };
}

function expectStatus(result, status) {
    assert.equal(result.response.status, status, JSON.stringify(result.data));
    return result.data;
}

async function listen(app) {
    const server = app.listen(0, "127.0.0.1");
    await once(server, "listening");
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    return { server, baseUrl: `http://127.0.0.1:${address.port}` };
}

async function fixture(
    t,
    { paymentGateway = createMockPaymentGateway(), realtime = false } = {}
) {
    const db = await createDatabase({ mode: "memory" });
    let server;
    let io;
    t.after(async () => {
        if (io) await new Promise((resolve) => io.close(resolve));
        if (server?.listening) {
            server.closeAllConnections();
            await new Promise((resolve, reject) =>
                server.close((error) => (error ? reject(error) : resolve()))
            );
        }
        await db.close();
    });
    await db.migrate();
    const events = new EventEmitter();
    const approvals = [];
    const payments = [];
    const pdfPackages = new Map();
    events.on("claim:approved", (approval) => approvals.push(approval));
    const claims = createClaimsService({
        db,
        events,
        pdfGenerator: async (input) => {
            const buffer = await generateClaimPdf(input);
            pdfPackages.set(input.claim.id, buffer);
            return buffer;
        },
        paymentGateway: {
            async pay(input) {
                payments.push({ ...input });
                return paymentGateway.pay(input);
            },
        },
    });
    const services = {
        auth: createAuthService({ db, jwtSecret: JWT_SECRET }),
        users: createUsersService({ db }),
        flights: createFlightsService({ db, claimsService: claims }),
        trackedFlights: createTrackedFlightsService({
            db,
            claimsService: claims,
        }),
        claims,
    };
    const listening = await listen(
        createApp({
            db,
            jwtSecret: JWT_SECRET,
            clientOrigin: "http://localhost:5173",
            services,
        })
    );
    server = listening.server;
    if (realtime) {
        io = attachRealtime(server, {
            jwtSecret: JWT_SECRET,
            clientOrigin: "http://localhost:5173",
            authService: services.auth,
            events,
        });
    }
    const api = (path, options) => request(listening.baseUrl, path, options);

    return {
        api,
        db,
        services,
        approvals,
        payments,
        pdfPackages,
        io,
        baseUrl: listening.baseUrl,
        async register(
            email = "passenger@example.test",
            name = "Test Passenger"
        ) {
            const result = await api("/api/auth/register", {
                method: "POST",
                body: { name, email, password: PASSWORD },
            });
            return expectStatus(result, 201).data;
        },
        async admin() {
            const user = await createUserDAL(db).create({
                id: randomUUID(),
                name: "Operations Admin",
                email: "admin@example.test",
                passwordHash: "unused-fixture-password-hash",
                role: "ADMIN",
            });
            return { user, token: signToken(user, JWT_SECRET) };
        },
    };
}

function flightInput({
    hoursAway = 48,
    flightNumber = "LY315",
    ...overrides
} = {}) {
    const departure = Date.now() + hoursAway * 60 * 60 * 1000;
    return {
        flightNumber,
        airline: "El Al",
        departureAirport: "TLV",
        arrivalAirport: "LHR",
        departureLat: 32.0114,
        departureLon: 34.8867,
        arrivalLat: 51.47,
        arrivalLon: -0.4543,
        scheduledDeparture: new Date(departure).toISOString(),
        scheduledArrival: new Date(
            departure + 5 * 60 * 60 * 1000
        ).toISOString(),
        ...overrides,
    };
}

async function track(ctx, auth, flight, pnr) {
    return expectStatus(
        await ctx.api("/api/trackedFlights", {
            method: "POST",
            token: auth.token,
            body: { flight, pnr },
        }),
        201
    ).data;
}

async function claimsFor(ctx, auth) {
    return expectStatus(
        await ctx.api("/api/claims", { token: auth.token }),
        200
    ).data;
}

async function updateStatus(ctx, admin, flightId, status, delayMinutes = 0) {
    return ctx.api(`/api/flights/${flightId}/status`, {
        method: "PATCH",
        token: admin.token,
        body: { status, delayMinutes },
    });
}

test("authentication validates input, hashes passwords, and prevents role escalation", async (t) => {
    const ctx = await fixture(t);
    for (const path of [
        "/api/auth/me",
        "/api/users/me",
        "/api/trackedFlights",
        "/api/claims",
    ]) {
        expectStatus(await ctx.api(path), 401);
    }
    expectStatus(
        await ctx.api("/api/auth/register", {
            method: "POST",
            body: {
                name: "Test Passenger",
                email: "not-an-email",
                password: "short",
            },
        }),
        400
    );

    const passenger = await ctx.register();
    assert.equal(passenger.user.role, "USER");
    assert.equal(typeof passenger.token, "string");
    assert.equal("passwordHash" in passenger.user, false);
    assert.equal("password" in passenger.user, false);
    const stored = await createUserDAL(ctx.db).findById(passenger.user.id);
    assert.notEqual(stored.passwordHash, PASSWORD);
    assert.match(stored.passwordHash, /^\$2[aby]\$/);

    expectStatus(
        await ctx.api("/api/auth/register", {
            method: "POST",
            body: {
                name: "Duplicate",
                email: passenger.user.email,
                password: PASSWORD,
            },
        }),
        409
    );
    expectStatus(
        await ctx.api("/api/auth/login", {
            method: "POST",
            body: {
                email: passenger.user.email,
                password: "Wrong-password-47",
            },
        }),
        401
    );
    const login = expectStatus(
        await ctx.api("/api/auth/login", {
            method: "POST",
            body: { email: passenger.user.email, password: PASSWORD },
        }),
        200
    ).data;
    assert.equal(login.user.id, passenger.user.id);
    const me = expectStatus(
        await ctx.api("/api/auth/me", { token: login.token }),
        200
    ).data;
    assert.equal(me.id, passenger.user.id);
    expectStatus(
        await ctx.api("/api/auth/me", { token: `${login.token}tampered` }),
        401
    );

    // Either reject unknown privilege fields or ignore them; they must never confer ADMIN.
    const escalation = await ctx.api("/api/auth/register", {
        method: "POST",
        body: {
            name: "Forged Admin",
            email: "forged@example.test",
            password: PASSWORD,
            role: "ADMIN",
        },
    });
    assert.ok(
        [400, 201].includes(escalation.response.status),
        JSON.stringify(escalation.data)
    );
    if (escalation.response.status === 201)
        assert.equal(escalation.data.data.user.role, "USER");
    const forged = await createUserDAL(ctx.db).findByEmail(
        "forged@example.test"
    );
    assert.notEqual(forged?.role, "ADMIN");

    const profileUpdate = await ctx.api("/api/users/me", {
        method: "PATCH",
        token: passenger.token,
        body: { name: "Updated Passenger", role: "ADMIN" },
    });
    assert.ok(
        [400, 200].includes(profileUpdate.response.status),
        JSON.stringify(profileUpdate.data)
    );
    assert.equal(
        (await createUserDAL(ctx.db).findById(passenger.user.id)).role,
        "USER"
    );
    expectStatus(
        await updateStatus(ctx, passenger, randomUUID(), "CANCELLED"),
        403
    );
});

test("registrations validate PNRs, share the canonical flight, and isolate each passenger", async (t) => {
    const ctx = await fixture(t);
    const alice = await ctx.register("alice@example.test", "Alice Passenger");
    const bob = await ctx.register("bob@example.test", "Bob Passenger");
    const flight = flightInput();

    for (const pnr of ["", "ABCDE", "ABCDEFG", "ABC!23"]) {
        expectStatus(
            await ctx.api("/api/trackedFlights", {
                method: "POST",
                token: alice.token,
                body: { flight, pnr },
            }),
            400
        );
    }
    const first = await track(ctx, alice, flight, "ABC123");
    const second = await track(ctx, bob, flight, "DEF456");
    assert.equal(first.flightId, second.flightId);
    assert.notEqual(first.id, second.id);
    assert.equal(first.flight.trackingStatus, "PENDING_ACTIVE");
    assert.ok(first.flight.distanceKm > 3500 && first.flight.distanceKm < 3600);
    assert.equal(ctx.payments.length, 0);

    const duplicate = await ctx.api("/api/trackedFlights", {
        method: "POST",
        token: bob.token,
        body: { flight, pnr: "abc123" },
    });
    expectStatus(duplicate, 409);

    const conflictingRoute = await ctx.api("/api/trackedFlights", {
        method: "POST",
        token: bob.token,
        body: { flight: { ...flight, arrivalAirport: "CDG" }, pnr: "GHI789" },
    });
    expectStatus(conflictingRoute, 409);
    const aliceFlights = expectStatus(
        await ctx.api("/api/trackedFlights", { token: alice.token }),
        200
    ).data;
    const bobFlights = expectStatus(
        await ctx.api("/api/trackedFlights", { token: bob.token }),
        200
    ).data;
    assert.deepEqual(
        aliceFlights.map((entry) => entry.id),
        [first.id]
    );
    assert.deepEqual(
        bobFlights.map((entry) => entry.id),
        [second.id]
    );
    expectStatus(
        await ctx.api(`/api/trackedFlights/${first.id}`, { token: bob.token }),
        404
    );
    expectStatus(
        await ctx.api(`/api/trackedFlights/${first.id}`, {
            method: "DELETE",
            token: bob.token,
        }),
        404
    );
    expectStatus(
        await ctx.api("/api/trackedFlights/not-a-uuid", { token: alice.token }),
        400
    );
    expectStatus(
        await ctx.api(`/api/trackedFlights/${first.id}`, {
            method: "DELETE",
            token: alice.token,
        }),
        204
    );
    expectStatus(
        await ctx.api(`/api/trackedFlights/${first.id}`, {
            token: alice.token,
        }),
        404
    );
    expectStatus(
        await ctx.api(`/api/trackedFlights/${second.id}`, { token: bob.token }),
        200
    );
});

test("exactly 480 minutes creates paid claims and private PDF packages once for all passengers", async (t) => {
    const ctx = await fixture(t);
    const alice = await ctx.register("alice@example.test", "Alice Passenger");
    const bob = await ctx.register("bob@example.test", "Bob Passenger");
    const admin = await ctx.admin();
    const flight = flightInput({ hoursAway: 12 });
    const first = await track(ctx, alice, flight, "ABC123");
    const second = await track(ctx, bob, flight, "DEF456");
    assert.equal(first.flight.trackingStatus, "ACTIVE_TRACKING");

    expectStatus(
        await updateStatus(ctx, admin, first.flightId, "DELAYED", 479),
        200
    );
    assert.deepEqual(await claimsFor(ctx, alice), []);
    assert.equal(ctx.approvals.length, 0);
    assert.equal(ctx.payments.length, 0);
    expectStatus(
        await updateStatus(ctx, admin, first.flightId, "DELAYED", 480),
        200
    );

    const aliceClaims = await claimsFor(ctx, alice);
    const bobClaims = await claimsFor(ctx, bob);
    assert.equal(aliceClaims.length, 1);
    assert.equal(bobClaims.length, 1);
    for (const claim of [...aliceClaims, ...bobClaims]) {
        assert.equal(claim.status, "PAID");
        assert.equal(claim.amountIls, 2450);
        assert.match(claim.mockTransactionId, /^mock_/);
        assert.ok(claim.paidAt);
        assert.equal("pdfBuffer" in claim, false);
    }
    assert.equal(aliceClaims[0].trackedFlightId, first.id);
    assert.equal(bobClaims[0].trackedFlightId, second.id);
    assert.notEqual(
        aliceClaims[0].mockTransactionId,
        bobClaims[0].mockTransactionId
    );
    assert.equal(ctx.approvals.length, 2);
    assert.deepEqual(
        new Set(ctx.approvals.map((event) => event.userId)),
        new Set([alice.user.id, bob.user.id])
    );
    assert.ok(
        ctx.approvals.every(
            (event) =>
                event.claim.status === "PAID" && !("pdfBuffer" in event.claim)
        )
    );

    const pdf = await ctx.api(`/api/claims/${aliceClaims[0].id}/pdf`, {
        token: alice.token,
    });
    expectStatus(pdf, 200);
    assert.match(pdf.response.headers.get("content-type"), /^application\/pdf/);
    assert.match(pdf.response.headers.get("content-disposition"), /attachment/);
    assert.equal(pdf.data.subarray(0, 5).toString(), "%PDF-");
    assert.ok(pdf.data.length > 1000);
    assert.deepEqual(
        pdf.data,
        ctx.pdfPackages.get(aliceClaims[0].id),
        "The downloaded PDF must preserve the complete binary stream."
    );
    expectStatus(
        await ctx.api(`/api/claims/${aliceClaims[0].id}`, { token: bob.token }),
        404
    );
    expectStatus(
        await ctx.api(`/api/claims/${aliceClaims[0].id}/pdf`, {
            token: bob.token,
        }),
        404
    );
    expectStatus(await ctx.api(`/api/claims/${aliceClaims[0].id}/pdf`), 401);
    expectStatus(
        await ctx.api(`/api/trackedFlights/${first.id}`, {
            method: "DELETE",
            token: alice.token,
        }),
        409
    );

    expectStatus(
        await updateStatus(ctx, admin, first.flightId, "DELAYED", 600),
        200
    );
    const repeated = await Promise.all([
        ctx.services.claims.processFlight(first.flightId),
        ctx.services.claims.processFlight(first.flightId),
    ]);
    assert.deepEqual(repeated, [[], []]);
    assert.equal((await claimsFor(ctx, alice)).length, 1);
    assert.equal((await claimsFor(ctx, bob)).length, 1);
    assert.equal(ctx.payments.length, 2);
    assert.equal(ctx.approvals.length, 2);
});

test("cancellation with no delay pays the long-distance tier and retains completed tracking", async (t) => {
    const ctx = await fixture(t);
    const alice = await ctx.register();
    const admin = await ctx.admin();
    const flight = flightInput({
        hoursAway: 8,
        flightNumber: "LY001",
        arrivalAirport: "JFK",
        arrivalLat: 40.6413,
        arrivalLon: -73.7781,
    });
    const tracked = await track(ctx, alice, flight, "LONG12");
    const cancelled = expectStatus(
        await updateStatus(ctx, admin, tracked.flightId, "CANCELLED"),
        200
    ).data;
    assert.equal(cancelled.status, "CANCELLED");
    assert.equal(cancelled.trackingStatus, "COMPLETED");
    const claims = await claimsFor(ctx, alice);
    assert.equal(claims.length, 1);
    assert.equal(claims[0].amountIls, 3670);
    assert.equal(claims[0].status, "PAID");

    const stale = expectStatus(
        await updateStatus(ctx, admin, tracked.flightId, "SCHEDULED"),
        200
    ).data;
    assert.equal(stale.status, "CANCELLED");
    assert.equal(stale.trackingStatus, "COMPLETED");
    assert.equal(ctx.payments.length, 1);
    assert.equal(ctx.approvals.length, 1);
});

test("a failed payout rolls back every claim and notification, then concurrent retries pay once", async (t) => {
    const successfulGateway = createMockPaymentGateway();
    let shouldFail = true;
    let attempts = 0;
    const ctx = await fixture(t, {
        paymentGateway: {
            async pay(input) {
                attempts += 1;
                if (shouldFail && attempts === 2)
                    throw new Error("Simulated gateway outage");
                return successfulGateway.pay(input);
            },
        },
    });
    const alice = await ctx.register("alice@example.test", "Alice Passenger");
    const bob = await ctx.register("bob@example.test", "Bob Passenger");
    const flight = flightInput({ hoursAway: 4 });
    const first = await track(ctx, alice, flight, "ABC123");
    await track(ctx, bob, flight, "DEF456");

    await assert.rejects(
        ctx.services.flights.updateStatus(first.flightId, {
            status: "DELAYED",
            delayMinutes: 480,
        }),
        /Simulated gateway outage/
    );
    assert.deepEqual(await claimsFor(ctx, alice), []);
    assert.deepEqual(await claimsFor(ctx, bob), []);
    assert.equal(ctx.approvals.length, 0);
    assert.equal(ctx.payments.length, 2);
    shouldFail = false;

    const results = await Promise.all([
        ctx.services.claims.processFlight(first.flightId),
        ctx.services.claims.processFlight(first.flightId),
    ]);
    assert.equal(results.flat().length, 2);
    assert.equal((await claimsFor(ctx, alice)).length, 1);
    assert.equal((await claimsFor(ctx, bob)).length, 1);
    assert.equal(ctx.approvals.length, 2);
    assert.equal(ctx.payments.length, 4);
    // Rollback retries must reuse the gateway key even though claim IDs were rolled back.
    assert.deepEqual(
        ctx.payments
            .slice(0, 2)
            .map((payment) => payment.idempotencyKey)
            .sort(),
        ctx.payments
            .slice(2)
            .map((payment) => payment.idempotencyKey)
            .sort()
    );
});

test("registration on a completed disrupted flight rolls back on payout failure and can be retried", async (t) => {
    const successfulGateway = createMockPaymentGateway();
    let shouldFail = false;
    const ctx = await fixture(t, {
        paymentGateway: {
            async pay(input) {
                if (shouldFail)
                    throw new Error(
                        "Simulated late-registration gateway outage"
                    );
                return successfulGateway.pay(input);
            },
        },
    });
    const alice = await ctx.register("alice@example.test", "Alice Passenger");
    const bob = await ctx.register("bob@example.test", "Bob Passenger");
    const admin = await ctx.admin();
    const flight = flightInput({ hoursAway: 5 });
    const tracked = await track(ctx, alice, flight, "ABC123");
    const cancelled = expectStatus(
        await updateStatus(ctx, admin, tracked.flightId, "CANCELLED"),
        200
    ).data;
    assert.equal(cancelled.trackingStatus, "COMPLETED");
    assert.equal(ctx.approvals.length, 1);

    shouldFail = true;
    expectStatus(
        await ctx.api("/api/trackedFlights", {
            method: "POST",
            token: bob.token,
            body: { flight, pnr: "DEF456" },
        }),
        500
    );
    const bobTracked = expectStatus(
        await ctx.api("/api/trackedFlights", { token: bob.token }),
        200
    ).data;
    assert.deepEqual(
        bobTracked,
        [],
        "A failed registration must not leave a PNR permanently reserved without a retry path."
    );
    assert.deepEqual(await claimsFor(ctx, bob), []);
    assert.equal(ctx.approvals.length, 1);
    assert.equal((await claimsFor(ctx, alice)).length, 1);

    shouldFail = false;
    const retried = await track(ctx, bob, flight, "DEF456");
    assert.equal(retried.flightId, tracked.flightId);
    const bobClaims = await claimsFor(ctx, bob);
    assert.equal(bobClaims.length, 1);
    assert.equal(bobClaims[0].status, "PAID");
    assert.equal(ctx.approvals.length, 2);
});

test(
    "WebSocket authentication and private rooms deliver approvals only to the claim owners",
    { timeout: 15000 },
    async (t) => {
        const ctx = await fixture(t, { realtime: true });
        const alice = await ctx.register(
            "alice@example.test",
            "Alice Passenger"
        );
        const bob = await ctx.register("bob@example.test", "Bob Passenger");
        const observer = await ctx.register(
            "observer@example.test",
            "Unrelated Passenger"
        );
        const admin = await ctx.admin();
        const clients = [];
        t.after(() => clients.forEach((client) => client.disconnect()));

        const connect = (token) => {
            const socket = createSocketClient(ctx.baseUrl, {
                auth: token ? { token } : {},
                transports: ["websocket"],
                reconnection: false,
                forceNew: true,
            });
            // A round-trip barrier later proves that prior event packets have been consumed.
            socket.on("integration:barrier", (acknowledge) => acknowledge());
            clients.push(socket);
            return socket;
        };
        const anonymous = connect();
        const [failure] = await once(anonymous, "connect_error");
        assert.match(failure.message, /Unauthorized/);
        assert.equal(anonymous.connected, false);

        const aliceSocket = connect(alice.token);
        const bobSocket = connect(bob.token);
        const observerSocket = connect(observer.token);
        await Promise.all(
            [aliceSocket, bobSocket, observerSocket].map((socket) =>
                once(socket, "connect")
            )
        );
        const received = { alice: [], bob: [], observer: [] };
        aliceSocket.on("CLAIM_APPROVED", (claim) => received.alice.push(claim));
        bobSocket.on("CLAIM_APPROVED", (claim) => received.bob.push(claim));
        observerSocket.on("CLAIM_APPROVED", (claim) =>
            received.observer.push(claim)
        );

        const flight = flightInput({ hoursAway: 6 });
        const tracked = await track(ctx, alice, flight, "ABC123");
        await track(ctx, bob, flight, "DEF456");
        expectStatus(
            await updateStatus(ctx, admin, tracked.flightId, "CANCELLED"),
            200
        );
        await new Promise((resolve, reject) => {
            ctx.io
                .timeout(2000)
                .emit("integration:barrier", (error) =>
                    error ? reject(error) : resolve()
                );
        });
        assert.equal(received.alice.length, 1);
        assert.equal(received.bob.length, 1);
        assert.equal(received.alice[0].userId, alice.user.id);
        assert.equal(received.bob[0].userId, bob.user.id);
        assert.equal(received.alice[0].status, "PAID");
        assert.equal("pdfBuffer" in received.alice[0], false);
        assert.deepEqual(received.observer, []);
    }
);
