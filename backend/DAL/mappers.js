const timestamp = (value) =>
    value == null ? null : new Date(value).toISOString();

export function mapUser(row) {
    if (!row) {
        return null;
    }
    const user = {
        id: row.id,
        name: row.name,
        email: row.email,
        role: row.role,
        passwordHash: row.password_hash,
        emailVerified: row.email_verified === true,
    };
    return user;
}

export function mapFlight(row) {
    if (!row) {
        return null;
    }
    const flight = {
        id: row.id,
        flightNumber: row.flight_number,
        isDemo: row.is_demo === true,
        airline: row.airline,
        departureAirport: row.departure_airport,
        arrivalAirport: row.arrival_airport,
        departureLat: row.departure_lat,
        departureLon: row.departure_lon,
        arrivalLat: row.arrival_lat,
        arrivalLon: row.arrival_lon,
        scheduledDeparture: timestamp(row.scheduled_departure),
        scheduledArrival: timestamp(row.scheduled_arrival),
        distanceKm: row.distance_km,
        trackingStatus: row.tracking_status,
        status: row.status,
        delayMinutes: row.delay_minutes,
        createdAt: timestamp(row.created_at),
        updatedAt: timestamp(row.updated_at),
    };
    return flight;
}

export function mapTrackedFlight(row) {
    if (!row) {
        return null;
    }
    const trackedFlight = {
        id: row.tracked_id,
        userId: row.user_id,
        flightId: row.flight_id,
        pnr: row.pnr,
        createdAt: timestamp(row.tracked_created_at),
        flight: mapFlight(row),
    };
    return trackedFlight;
}

export function mapClaim(row) {
    if (!row) {
        return null;
    }
    const claim = {
        id: row.claim_id,
        userId: row.user_id,
        trackedFlightId: row.tracked_flight_id,
        flightId: row.flight_id,
        amountIls: row.amount_ils,
        status: row.claim_status,
        emailStatus: row.email_status,
        emailSentAt: timestamp(row.email_sent_at),
        emailError: row.email_error,
        emailAttempts: row.email_attempts,
        mockTransactionId: row.mock_transaction_id,
        pdfBuffer: row.pdf_buffer,
        createdAt: timestamp(row.claim_created_at),
        paidAt: timestamp(row.paid_at),
        flight: mapFlight(row),
    };
    return claim;
}
