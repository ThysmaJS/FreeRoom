CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student'
    CHECK (role IN ('student', 'admin', 'superadmin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- CREATE TABLE IF NOT EXISTS is a no-op on a table that already exists, so
-- role needs its own idempotent migration for pre-existing databases.
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'student'
  CHECK (role IN ('student', 'admin', 'superadmin'));

-- One-time backfill from the old is_admin boolean (superseded by role),
-- guarded so it's a no-op once is_admin is gone — including on a database
-- that never had it in the first place.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'is_admin'
  ) THEN
    UPDATE users SET role = 'admin' WHERE is_admin = true AND role = 'student';
    ALTER TABLE users DROP COLUMN is_admin;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS rooms (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  capacity INTEGER,
  floor SMALLINT NOT NULL DEFAULT 0
);

-- CREATE TABLE IF NOT EXISTS is a no-op on a table that already exists, so
-- floor needs its own idempotent migration for pre-existing databases.
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS floor SMALLINT NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS bookings (
  id SERIAL PRIMARY KEY,
  room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_hour SMALLINT NOT NULL CHECK (start_hour >= 8 AND start_hour < 19),
  end_hour SMALLINT NOT NULL CHECK (end_hour = start_hour + 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (room_id, date, start_hour)
);

CREATE INDEX IF NOT EXISTS bookings_user_id_idx ON bookings (user_id);
CREATE INDEX IF NOT EXISTS bookings_room_date_idx ON bookings (room_id, date);
