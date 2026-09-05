-- 0059_cms_and_landing_enhancements.sql
-- Migration: Add slug, summary, content, and rich fields to cms_articles and landing_settings

-- 1. Enhance cms_articles
ALTER TABLE public.cms_articles 
  ADD COLUMN IF NOT EXISTS summary TEXT,
  ADD COLUMN IF NOT EXISTS content TEXT,
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS read_time TEXT DEFAULT '5 min read',
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}'::text[];

-- Create index on slug if not exists
CREATE INDEX IF NOT EXISTS idx_cms_articles_slug ON public.cms_articles(slug);

-- 2. Enhance landing_settings
ALTER TABLE public.landing_settings
  ADD COLUMN IF NOT EXISTS announcements JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS faqs JSONB DEFAULT '{"patient": [], "provider": []}'::jsonb,
  ADD COLUMN IF NOT EXISTS testimonials JSONB DEFAULT '{"patient": [], "provider": []}'::jsonb,
  ADD COLUMN IF NOT EXISTS seo_metadata JSONB DEFAULT '{"patient": {}, "provider": {}}'::jsonb,
  ADD COLUMN IF NOT EXISTS hero_cta JSONB DEFAULT '{"patient": {}, "provider": {}}'::jsonb;
