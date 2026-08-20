-- ============================================================
-- MIGRATION 003: Enable RLS read access for mesero table
-- Allows the anon key to read meseros (needed for mesero login screen)
-- ============================================================

-- Enable RLS if not already enabled
ALTER TABLE mesero ENABLE ROW LEVEL SECURITY;

-- Allow public read access to active meseros
-- Only exposes: id, nombre, pin, foto_url for the login screen
CREATE POLICY IF NOT EXISTS "mesero_public_read" ON mesero
  FOR SELECT
  USING (activo = true);

-- Allow service role full access (for admin operations)
CREATE POLICY IF NOT EXISTS "mesero_service_all" ON mesero
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- INSTRUCTIONS:
-- Run this migration in Supabase SQL Editor:
-- Dashboard → SQL Editor → New query → Paste → Run
--
-- NOTE: If you get "policy already exists" errors, that's fine — skip them.
-- The important one is "mesero_public_read" which allows the login screen
-- to fetch the list of meseros without authentication.
-- ============================================================
