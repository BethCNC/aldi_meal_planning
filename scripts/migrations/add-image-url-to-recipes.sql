-- Migration: add image_url column to recipes
-- Usage: psql or Supabase SQL editor

ALTER TABLE recipes
    ADD COLUMN IF NOT EXISTS image_url TEXT;
