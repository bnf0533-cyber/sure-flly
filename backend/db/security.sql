-- Supabase exposes the public schema through its data API. No public policies
-- are granted: access is exclusively through the trusted backend DB owner (or
-- a dedicated role with BYPASSRLS), never through browser anon/service keys.
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE flights ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracked_flights ENABLE ROW LEVEL SECURITY;
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;
