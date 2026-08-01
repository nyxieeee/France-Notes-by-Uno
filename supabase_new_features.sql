-- ====================================================================
-- SUPABASE DATABASE SCHEMA FOR FRANCE NOTES NEW FEATURES
-- Run this script in the Supabase SQL Editor (https://supabase.com/dashboard)
-- ====================================================================

-- 1. PODCAST EPISODES TABLE
DROP TABLE IF EXISTS podcast_episodes CASCADE;

CREATE TABLE podcast_episodes (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  topic TEXT,
  script JSONB NOT NULL,
  source_type TEXT DEFAULT 'Custom Topic',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS & Policies for podcast_episodes
ALTER TABLE podcast_episodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own podcast episodes"
  ON podcast_episodes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own podcast episodes"
  ON podcast_episodes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own podcast episodes"
  ON podcast_episodes FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_podcast_episodes_user_id ON podcast_episodes(user_id);
CREATE INDEX idx_podcast_episodes_created_at ON podcast_episodes(created_at DESC);


-- 2. DOSAGE CALCULATIONS TABLE
DROP TABLE IF EXISTS dosage_calculations CASCADE;

CREATE TABLE dosage_calculations (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  calc_type TEXT NOT NULL, -- 'iv' or 'med'
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS & Policies for dosage_calculations
ALTER TABLE dosage_calculations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own dosage calculations"
  ON dosage_calculations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own dosage calculations"
  ON dosage_calculations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own dosage calculations"
  ON dosage_calculations FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_dosage_calculations_user_id ON dosage_calculations(user_id);
CREATE INDEX idx_dosage_calculations_created_at ON dosage_calculations(created_at DESC);


-- 3. SAVED LABS TABLE
DROP TABLE IF EXISTS saved_labs CASCADE;

CREATE TABLE saved_labs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lab_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_lab UNIQUE (user_id, lab_name)
);

-- Enable RLS & Policies for saved_labs
ALTER TABLE saved_labs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own saved labs"
  ON saved_labs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own saved labs"
  ON saved_labs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved labs"
  ON saved_labs FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_saved_labs_user_id ON saved_labs(user_id);
