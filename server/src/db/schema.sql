CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS toilets (
  id SERIAL PRIMARY KEY,
  osm_id BIGINT UNIQUE,
  name TEXT,
  description TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  geom GEOMETRY(Point, 4326),
  is_free BOOLEAN DEFAULT true,
  is_accessible BOOLEAN DEFAULT false,
  has_baby_change BOOLEAN DEFAULT false,
  is_gender_neutral BOOLEAN DEFAULT false,
  is_indoor BOOLEAN DEFAULT false,
  venue_type TEXT DEFAULT 'street',
  building_name TEXT,
  address TEXT,
  floor_level TEXT,
  opening_hours TEXT,
  status TEXT DEFAULT 'open',
  quality_score DOUBLE PRECISION DEFAULT 5.0,
  average_rating DOUBLE PRECISION,
  review_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_toilets_geom ON toilets USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_toilets_status ON toilets(status);

DROP TABLE IF EXISTS reviews;

CREATE TABLE IF NOT EXISTS reviews (
  id SERIAL PRIMARY KEY,
  toilet_id INTEGER REFERENCES toilets(id) ON DELETE CASCADE,
  fingerprint TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating IN (0, 1)),
  comment TEXT CHECK (char_length(comment) <= 200),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reviews_toilet ON reviews(toilet_id);
CREATE INDEX IF NOT EXISTS idx_reviews_fingerprint ON reviews(fingerprint, toilet_id);

-- Add new columns to existing tables (safe to re-run)
ALTER TABLE toilets ADD COLUMN IF NOT EXISTS building_name TEXT;
ALTER TABLE toilets ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE toilets ADD COLUMN IF NOT EXISTS floor_level TEXT;
ALTER TABLE toilets ADD COLUMN IF NOT EXISTS positive_percentage DOUBLE PRECISION DEFAULT 0;
ALTER TABLE toilets DROP COLUMN IF EXISTS average_rating;
