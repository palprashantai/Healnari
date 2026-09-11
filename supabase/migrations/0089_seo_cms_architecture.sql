-- 0089_seo_cms_architecture.sql
-- Phase 3: SEO Content Management System Schema

-- 1. Update status enum constraint on cms_articles
-- Drop the existing constraint (from 0009_admin_tables.sql)
ALTER TABLE public.cms_articles DROP CONSTRAINT IF EXISTS cms_articles_status_check;

-- Add the new comprehensive status constraint
ALTER TABLE public.cms_articles 
  ADD CONSTRAINT cms_articles_status_check 
  CHECK (status IN ('Draft', 'In Review', 'Medical Review', 'Approved', 'Scheduled', 'Published', 'Archived', 'Rejected'));

-- 2. Add Lifecycle Fields to cms_articles
ALTER TABLE public.cms_articles
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS scheduled_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- 3. Add SEO Fields to cms_articles
ALTER TABLE public.cms_articles
  ADD COLUMN IF NOT EXISTS seo_title text,
  ADD COLUMN IF NOT EXISTS meta_description text,
  ADD COLUMN IF NOT EXISTS canonical_url text,
  ADD COLUMN IF NOT EXISTS robots text DEFAULT 'INDEX, FOLLOW',
  ADD COLUMN IF NOT EXISTS primary_keyword text,
  ADD COLUMN IF NOT EXISTS search_intent text,
  ADD COLUMN IF NOT EXISTS featured_image text,
  ADD COLUMN IF NOT EXISTS image_alt text;

-- 4. Add Medical Fields to cms_articles
ALTER TABLE public.cms_articles
  ADD COLUMN IF NOT EXISTS medical_reviewer text,
  ADD COLUMN IF NOT EXISTS medical_reviewer_credentials text,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS references_json jsonb DEFAULT '[]'::jsonb;

-- 5. Add Relationship Fields to cms_articles
ALTER TABLE public.cms_articles
  ADD COLUMN IF NOT EXISTS topic_cluster text,
  ADD COLUMN IF NOT EXISTS related_conditions text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS related_specialties text[] DEFAULT '{}'::text[];

-- 6. Create Table: cms_content_versions
CREATE TABLE IF NOT EXISTS public.cms_content_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES public.cms_articles(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  title text NOT NULL,
  content text,
  seo_metadata jsonb DEFAULT '{}'::jsonb,
  changed_by text,
  changed_at timestamptz NOT NULL DEFAULT now()
);

-- 7. Create Table: cms_redirects
CREATE TABLE IF NOT EXISTS public.cms_redirects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  old_path text NOT NULL UNIQUE,
  new_path text NOT NULL,
  status_code integer NOT NULL DEFAULT 301,
  created_at timestamptz NOT NULL DEFAULT now(),
  reason text
);

-- 8. Create Table: cms_audit_logs
CREATE TABLE IF NOT EXISTS public.cms_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid REFERENCES public.cms_articles(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  timestamp timestamptz NOT NULL DEFAULT now(),
  details jsonb DEFAULT '{}'::jsonb
);

-- 9. Add Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_cms_articles_status ON public.cms_articles(status);
CREATE INDEX IF NOT EXISTS idx_cms_articles_published_at ON public.cms_articles(published_at);
CREATE INDEX IF NOT EXISTS idx_cms_articles_scheduled_at ON public.cms_articles(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_cms_articles_deleted_at ON public.cms_articles(deleted_at);

CREATE INDEX IF NOT EXISTS idx_cms_content_versions_article_id ON public.cms_content_versions(article_id);
CREATE INDEX IF NOT EXISTS idx_cms_audit_logs_article_id ON public.cms_audit_logs(article_id);

-- 10. Enable Row Level Security on new tables
ALTER TABLE public.cms_content_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_redirects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_audit_logs ENABLE ROW LEVEL SECURITY;

-- Admins get full access to new tables
CREATE POLICY "admin_all_cms_content_versions" ON public.cms_content_versions FOR ALL TO authenticated USING (public.current_app_role() = 'admin') WITH CHECK (public.current_app_role() = 'admin');
CREATE POLICY "admin_all_cms_redirects" ON public.cms_redirects FOR ALL TO authenticated USING (public.current_app_role() = 'admin') WITH CHECK (public.current_app_role() = 'admin');
CREATE POLICY "admin_all_cms_audit_logs" ON public.cms_audit_logs FOR ALL TO authenticated USING (public.current_app_role() = 'admin') WITH CHECK (public.current_app_role() = 'admin');

-- Public can read redirects
CREATE POLICY "public_read_redirects" ON public.cms_redirects FOR SELECT TO anon, authenticated USING (true);

-- Update master_setup.sql as well by appending these tables to keep local dev in sync (if applicable)
-- But typically running migrations handles it.
