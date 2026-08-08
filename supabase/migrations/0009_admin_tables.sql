-- ─────────────────────────────────────────────────────────────
-- Admin Portal Tables: CMS, Templates, Broadcasts, Reports
-- ─────────────────────────────────────────────────────────────

create table public.message_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger message_templates_set_updated_at
  before update on public.message_templates
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- broadcast_history
-- ─────────────────────────────────────────────────────────────
create table public.broadcast_history (
  id uuid primary key default gen_random_uuid(),
  display_id text not null,
  subject text not null,
  audience text not null,
  status text not null default 'Sent' check (status in ('Sent', 'Scheduled', 'Draft', 'Failed')),
  opens text default '-',
  clicks text default '-',
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- reports_history
-- ─────────────────────────────────────────────────────────────
create table public.reports_history (
  id uuid primary key default gen_random_uuid(),
  report_id text not null unique,
  name text not null,
  type text not null,
  date timestamptz not null default now(),
  size text not null default '0 KB',
  status text not null default 'Generated' check (status in ('Generated', 'Failed', 'Processing')),
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- cms_articles (articles/banners/faqs)
-- ─────────────────────────────────────────────────────────────
create table public.cms_articles (
  id uuid primary key default gen_random_uuid(),
  display_id text not null unique,
  title text not null,
  author text not null,
  category text not null,
  status text not null default 'Draft' check (status in ('Draft', 'Published', 'Archived')),
  views text default '0',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger cms_articles_set_updated_at
  before update on public.cms_articles
  for each row execute function public.set_updated_at();

-- RLS Policies
alter table public.message_templates enable row level security;
alter table public.broadcast_history enable row level security;
alter table public.reports_history enable row level security;
alter table public.cms_articles enable row level security;

-- Admins get full access
create policy "admin_all_message_templates" on public.message_templates for all to authenticated using (public.current_app_role() = 'admin') with check (public.current_app_role() = 'admin');
create policy "admin_all_broadcast_history" on public.broadcast_history for all to authenticated using (public.current_app_role() = 'admin') with check (public.current_app_role() = 'admin');
create policy "admin_all_reports_history" on public.reports_history for all to authenticated using (public.current_app_role() = 'admin') with check (public.current_app_role() = 'admin');
create policy "admin_all_cms_articles" on public.cms_articles for all to authenticated using (public.current_app_role() = 'admin') with check (public.current_app_role() = 'admin');

-- Everyone can read published CMS articles
create policy "public_read_published_cms" on public.cms_articles for select to authenticated using (status = 'Published');

grant select, insert, update, delete on public.message_templates, public.broadcast_history, public.reports_history, public.cms_articles to authenticated;
