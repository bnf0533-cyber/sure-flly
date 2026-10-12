CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(254) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role VARCHAR(10) NOT NULL DEFAULT 'USER' CHECK (role IN ('USER', 'ADMIN')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS flights (
  id UUID PRIMARY KEY,
  flight_number VARCHAR(12) NOT NULL,
  airline VARCHAR(100) NOT NULL,
  departure_airport VARCHAR(3) NOT NULL,
  arrival_airport VARCHAR(3) NOT NULL,
  departure_lat DOUBLE PRECISION NOT NULL CHECK (departure_lat BETWEEN -90 AND 90),
  departure_lon DOUBLE PRECISION NOT NULL CHECK (departure_lon BETWEEN -180 AND 180),
  arrival_lat DOUBLE PRECISION NOT NULL CHECK (arrival_lat BETWEEN -90 AND 90),
  arrival_lon DOUBLE PRECISION NOT NULL CHECK (arrival_lon BETWEEN -180 AND 180),
  scheduled_departure TIMESTAMPTZ NOT NULL,
  scheduled_arrival TIMESTAMPTZ NOT NULL,
  distance_km DOUBLE PRECISION NOT NULL CHECK (distance_km >= 0),
  tracking_status VARCHAR(25) NOT NULL DEFAULT 'PENDING_ACTIVE'
    CHECK (tracking_status IN ('PENDING_ACTIVE', 'ACTIVE_TRACKING', 'COMPLETED')),
  status VARCHAR(15) NOT NULL DEFAULT 'SCHEDULED'
    CHECK (status IN ('SCHEDULED', 'DELAYED', 'CANCELLED', 'LANDED')),
  delay_minutes INTEGER NOT NULL DEFAULT 0 CHECK (delay_minutes >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (flight_number, scheduled_departure),
  CHECK (scheduled_arrival > scheduled_departure)
);

CREATE TABLE IF NOT EXISTS tracked_flights (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  flight_id UUID NOT NULL REFERENCES flights(id),
  pnr VARCHAR(6) NOT NULL CHECK (char_length(pnr) = 6),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (flight_id, pnr)
);

CREATE TABLE IF NOT EXISTS claims (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  tracked_flight_id UUID NOT NULL UNIQUE REFERENCES tracked_flights(id),
  flight_id UUID NOT NULL REFERENCES flights(id),
  amount_ils INTEGER NOT NULL CONSTRAINT claims_amount_ils_check CHECK (amount_ils >= 0),
  status VARCHAR(15) NOT NULL DEFAULT 'PROCESSING' CONSTRAINT claims_status_check CHECK (status IN ('PROCESSING', 'PAID', 'READY')),
  pdf_buffer BYTEA,
  mock_transaction_id VARCHAR(100) UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  paid_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS flights_tracking_departure_idx ON flights(tracking_status, scheduled_departure);
CREATE INDEX IF NOT EXISTS tracked_flights_user_idx ON tracked_flights(user_id);
CREATE INDEX IF NOT EXISTS tracked_flights_flight_idx ON tracked_flights(flight_id);
CREATE INDEX IF NOT EXISTS claims_user_idx ON claims(user_id);

ALTER TABLE flights ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE claims DROP CONSTRAINT IF EXISTS claims_status_check;
ALTER TABLE claims ADD CONSTRAINT claims_status_check CHECK (status IN ('PROCESSING', 'PAID', 'READY'));
ALTER TABLE claims DROP CONSTRAINT IF EXISTS claims_amount_ils_check;
ALTER TABLE claims ADD CONSTRAINT claims_amount_ils_check CHECK (amount_ils >= 0);
ALTER TABLE claims ADD COLUMN IF NOT EXISTS email_status VARCHAR(20) NOT NULL DEFAULT 'NOT_QUEUED';
ALTER TABLE claims ADD COLUMN IF NOT EXISTS email_to TEXT;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS email_attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS email_updated_at TIMESTAMPTZ;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMPTZ;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS email_next_attempt_at TIMESTAMPTZ;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS email_error TEXT;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS email_message_id TEXT;
